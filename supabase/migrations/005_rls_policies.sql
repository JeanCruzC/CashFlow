-- Migration 005: Row Level Security Policies
-- All tables with org_id get membership-based access control

-- Helper function: check if user is a member of an org
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check user role in org
CREATE OR REPLACE FUNCTION get_org_role(p_org_id UUID)
RETURNS member_role AS $$
  SELECT role FROM org_members
  WHERE org_id = p_org_id AND user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user can write (not viewer)
CREATE OR REPLACE FUNCTION can_write_org(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role != 'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is admin or owner
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- == ORGS ==
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON orgs FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "orgs_insert" ON orgs FOR INSERT
  WITH CHECK (TRUE); -- Anyone can create an org (they become owner)

CREATE POLICY "orgs_update" ON orgs FOR UPDATE
  USING (is_org_admin(id));

CREATE POLICY "orgs_delete" ON orgs FOR DELETE
  USING (get_org_role(id) = 'owner');

-- == ORG_MEMBERS ==
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON org_members FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "members_insert" ON org_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR is_org_admin(org_id)
  );

CREATE POLICY "members_update" ON org_members FOR UPDATE
  USING (is_org_admin(org_id));

CREATE POLICY "members_delete" ON org_members FOR DELETE
  USING (is_org_admin(org_id) OR user_id = auth.uid());

-- == ONBOARDING_STATE ==
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select" ON onboarding_state FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "onboarding_insert" ON onboarding_state FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_update" ON onboarding_state FOR UPDATE
  USING (user_id = auth.uid());

-- == ACCOUNTS ==
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select" ON accounts FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "accounts_insert" ON accounts FOR INSERT
  WITH CHECK (can_write_org(org_id));

CREATE POLICY "accounts_update" ON accounts FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "accounts_delete" ON accounts FOR DELETE
  USING (is_org_admin(org_id));

-- == CATEGORIES_GL ==
ALTER TABLE categories_gl ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories_gl FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "categories_insert" ON categories_gl FOR INSERT
  WITH CHECK (can_write_org(org_id));

CREATE POLICY "categories_update" ON categories_gl FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "categories_delete" ON categories_gl FOR DELETE
  USING (is_org_admin(org_id));

-- == COST_CENTERS ==
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_centers_select" ON cost_centers FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "cost_centers_insert" ON cost_centers FOR INSERT
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "cost_centers_update" ON cost_centers FOR UPDATE
  USING (is_org_admin(org_id));

CREATE POLICY "cost_centers_delete" ON cost_centers FOR DELETE
  USING (is_org_admin(org_id));

-- == COUNTERPARTIES ==
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counterparties_select" ON counterparties FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "counterparties_insert" ON counterparties FOR INSERT
  WITH CHECK (can_write_org(org_id));

CREATE POLICY "counterparties_update" ON counterparties FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "counterparties_delete" ON counterparties FOR DELETE
  USING (is_org_admin(org_id));

-- == TRANSACTIONS ==
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (can_write_org(org_id) AND created_by = auth.uid());

CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (is_org_admin(org_id));

-- == BUDGETS ==
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select" ON budgets FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "budgets_insert" ON budgets FOR INSERT
  WITH CHECK (can_write_org(org_id));

CREATE POLICY "budgets_update" ON budgets FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "budgets_delete" ON budgets FOR DELETE
  USING (is_org_admin(org_id));

-- == FORECAST_ASSUMPTIONS ==
ALTER TABLE forecast_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forecast_select" ON forecast_assumptions FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "forecast_insert" ON forecast_assumptions FOR INSERT
  WITH CHECK (can_write_org(org_id));

CREATE POLICY "forecast_update" ON forecast_assumptions FOR UPDATE
  USING (can_write_org(org_id));

CREATE POLICY "forecast_delete" ON forecast_assumptions FOR DELETE
  USING (is_org_admin(org_id));

-- == IMPORT_BATCHES ==
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_batches_select" ON import_batches FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "import_batches_insert" ON import_batches FOR INSERT
  WITH CHECK (can_write_org(org_id) AND user_id = auth.uid());

-- == IMPORT_ROWS ==
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_rows_select" ON import_rows FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM import_batches b
    WHERE b.id = import_rows.batch_id AND is_org_member(b.org_id)
  ));

-- == AUDIT_LOG ==
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_log FOR SELECT
  USING (is_org_admin(org_id));

CREATE POLICY "audit_insert" ON audit_log FOR INSERT
  WITH CHECK (is_org_member(org_id) AND user_id = auth.uid());
