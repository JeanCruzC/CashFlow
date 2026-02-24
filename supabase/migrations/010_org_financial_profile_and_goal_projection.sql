-- Migration 010: Personal financial profile + projected savings goals

CREATE TABLE IF NOT EXISTS public.org_financial_profile (
  org_id UUID PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
  monthly_income_net NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monthly_income_net >= 0),
  additional_income NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (additional_income >= 0),
  partner_contribution NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (partner_contribution >= 0),
  consolidated_income NUMERIC(15,2) GENERATED ALWAYS AS (monthly_income_net + additional_income + partner_contribution) STORED,
  distribution_rule TEXT NOT NULL DEFAULT '50_30_20' CHECK (distribution_rule IN ('50_30_20', '70_20_10', '80_20', 'custom')),
  needs_pct NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (needs_pct >= 0 AND needs_pct <= 100),
  wants_pct NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (wants_pct >= 0 AND wants_pct <= 100),
  savings_pct NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (savings_pct >= 0 AND savings_pct <= 100),
  debt_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (debt_pct >= 0 AND debt_pct <= 100),
  savings_priorities TEXT[] NOT NULL DEFAULT ARRAY['fixed_expenses','debt_payments','savings_goals']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_financial_profile_pct_sum CHECK (
    ABS((needs_pct + wants_pct + savings_pct + debt_pct) - 100) < 0.01
  )
);

DROP TRIGGER IF EXISTS update_org_financial_profile_modtime ON public.org_financial_profile;
CREATE TRIGGER update_org_financial_profile_modtime
BEFORE UPDATE ON public.org_financial_profile
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

ALTER TABLE public.org_financial_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_financial_profile_select" ON public.org_financial_profile FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "org_financial_profile_insert" ON public.org_financial_profile FOR INSERT
  WITH CHECK (can_write_org(org_id));

CREATE POLICY "org_financial_profile_update" ON public.org_financial_profile FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "org_financial_profile_delete" ON public.org_financial_profile FOR DELETE
  USING (is_org_admin(org_id));

ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS goal_weight NUMERIC(10,4) NOT NULL DEFAULT 1 CHECK (goal_weight > 0);

ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS monthly_contribution NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0);

ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;

