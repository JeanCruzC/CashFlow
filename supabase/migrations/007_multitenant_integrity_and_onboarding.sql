-- Migration 007: Multi-tenant integrity + atomic onboarding

-- ---------------------------------------------------------------------------
-- 1) Composite uniqueness to support tenant-safe foreign keys
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_org_id_id
  ON accounts(org_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_gl_org_id_id
  ON categories_gl(org_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_centers_org_id_id
  ON cost_centers(org_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_counterparties_org_id_id
  ON counterparties(org_id, id);

-- ---------------------------------------------------------------------------
-- 2) Replace FK constraints that only validate by id
-- ---------------------------------------------------------------------------
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_gl_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_counterparty_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_cost_center_id_fkey;

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_gl_id_fkey;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_cost_center_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_account_org_fkey'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_account_org_fkey
      FOREIGN KEY (org_id, account_id)
      REFERENCES accounts(org_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_category_org_fkey'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_category_org_fkey
      FOREIGN KEY (org_id, category_gl_id)
      REFERENCES categories_gl(org_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_counterparty_org_fkey'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_counterparty_org_fkey
      FOREIGN KEY (org_id, counterparty_id)
      REFERENCES counterparties(org_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_cost_center_org_fkey'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_cost_center_org_fkey
      FOREIGN KEY (org_id, cost_center_id)
      REFERENCES cost_centers(org_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'budgets_category_org_fkey'
      AND conrelid = 'budgets'::regclass
  ) THEN
    ALTER TABLE budgets
      ADD CONSTRAINT budgets_category_org_fkey
      FOREIGN KEY (org_id, category_gl_id)
      REFERENCES categories_gl(org_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'budgets_cost_center_org_fkey'
      AND conrelid = 'budgets'::regclass
  ) THEN
    ALTER TABLE budgets
      ADD CONSTRAINT budgets_cost_center_org_fkey
      FOREIGN KEY (org_id, cost_center_id)
      REFERENCES cost_centers(org_id, id);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Atomic onboarding function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_org_with_onboarding(
  p_profile_type org_type,
  p_org_name TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'US',
  p_currency TEXT DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_org_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_org_name := COALESCE(NULLIF(TRIM(p_org_name), ''), CASE
    WHEN p_profile_type = 'personal' THEN 'My Finances'
    ELSE 'My Business'
  END);

  INSERT INTO orgs (type, name, country, currency)
  VALUES (p_profile_type, v_org_name, p_country, p_currency)
  RETURNING id INTO v_org_id;

  INSERT INTO org_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  INSERT INTO onboarding_state (org_id, user_id, profile_type, step, answers)
  VALUES (v_org_id, v_user_id, p_profile_type, 1, '{}'::jsonb);

  IF p_profile_type = 'personal' THEN
    PERFORM seed_personal_categories(v_org_id);
  ELSE
    PERFORM seed_business_categories(v_org_id);
    PERFORM seed_business_cost_centers(v_org_id);
  END IF;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_org_with_onboarding(org_type, TEXT, TEXT, TEXT) TO authenticated;
