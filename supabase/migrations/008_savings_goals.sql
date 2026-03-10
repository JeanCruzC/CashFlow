-- Migration 008: Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(120) NOT NULL,
    target_amount NUMERIC(19,4) NOT NULL,
    current_amount NUMERIC(19,4) NOT NULL DEFAULT 0,
    deadline_date DATE,
    color_code VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_org_id ON public.savings_goals(org_id);

-- Generic modtime trigger helper (idempotent)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update 'updated_at'
DROP TRIGGER IF EXISTS update_savings_goals_modtime ON public.savings_goals;
CREATE TRIGGER update_savings_goals_modtime
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_goals_select" ON public.savings_goals;
CREATE POLICY "savings_goals_select" ON public.savings_goals FOR SELECT
  USING (is_org_member(org_id));

DROP POLICY IF EXISTS "savings_goals_insert" ON public.savings_goals;
CREATE POLICY "savings_goals_insert" ON public.savings_goals FOR INSERT
  WITH CHECK (can_write_org(org_id));

DROP POLICY IF EXISTS "savings_goals_update" ON public.savings_goals;
CREATE POLICY "savings_goals_update" ON public.savings_goals FOR UPDATE
  USING (can_write_org(org_id));

DROP POLICY IF EXISTS "savings_goals_delete" ON public.savings_goals;
CREATE POLICY "savings_goals_delete" ON public.savings_goals FOR DELETE
  USING (is_org_admin(org_id));
