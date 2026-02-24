-- Migration 011: enforce savings_goal tenant integrity on transactions

CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_goals_org_id_id
  ON public.savings_goals(org_id, id);

-- Clean orphaned/cross-tenant links before adding composite FK.
UPDATE public.transactions t
SET savings_goal_id = NULL
WHERE t.savings_goal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.savings_goals sg
    WHERE sg.id = t.savings_goal_id
      AND sg.org_id = t.org_id
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_savings_goal_id_fkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      DROP CONSTRAINT transactions_savings_goal_id_fkey;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_org_savings_goal_id_fkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_org_savings_goal_id_fkey
      FOREIGN KEY (org_id, savings_goal_id)
      REFERENCES public.savings_goals(org_id, id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_savings_goal_amount()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals
      SET current_amount = current_amount + NEW.amount
      WHERE id = NEW.savings_goal_id
        AND org_id = NEW.org_id;
    END IF;
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals
      SET current_amount = current_amount - OLD.amount
      WHERE id = OLD.savings_goal_id
        AND org_id = OLD.org_id;
    END IF;
    RETURN NULL;
  END IF;

  -- UPDATE
  IF OLD.savings_goal_id IS NOT NULL
    AND (
      NEW.savings_goal_id IS NULL
      OR OLD.savings_goal_id <> NEW.savings_goal_id
      OR OLD.org_id <> NEW.org_id
    ) THEN
    UPDATE public.savings_goals
    SET current_amount = current_amount - OLD.amount
    WHERE id = OLD.savings_goal_id
      AND org_id = OLD.org_id;
  END IF;

  IF NEW.savings_goal_id IS NOT NULL
    AND (
      OLD.savings_goal_id IS NULL
      OR OLD.savings_goal_id <> NEW.savings_goal_id
      OR OLD.org_id <> NEW.org_id
    ) THEN
    UPDATE public.savings_goals
    SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.savings_goal_id
      AND org_id = NEW.org_id;
  ELSIF NEW.savings_goal_id IS NOT NULL
    AND OLD.savings_goal_id = NEW.savings_goal_id
    AND OLD.org_id = NEW.org_id
    AND OLD.amount <> NEW.amount THEN
    UPDATE public.savings_goals
    SET current_amount = current_amount - OLD.amount + NEW.amount
    WHERE id = NEW.savings_goal_id
      AND org_id = NEW.org_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
