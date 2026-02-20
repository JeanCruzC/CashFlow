-- Migration 004: Budgets and Forecast Assumptions

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  category_gl_id UUID NOT NULL REFERENCES categories_gl(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, month, category_gl_id, cost_center_id)
);

CREATE INDEX idx_budgets_org ON budgets(org_id);
CREATE INDEX idx_budgets_month ON budgets(org_id, month);

CREATE TABLE forecast_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  revenue_growth_rate NUMERIC(8,4),
  revenue_amount NUMERIC(15,2),
  cogs_percent NUMERIC(5,2),
  fixed_opex NUMERIC(15,2),
  variable_opex_percent NUMERIC(5,2),
  one_off_amount NUMERIC(15,2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, month)
);

CREATE INDEX idx_forecast_org ON forecast_assumptions(org_id);

-- Import batches (Phase 2 but schema created now)
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('excel', 'csv')),
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  row_count INT,
  inserted_count INT,
  skipped_count INT,
  error_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}',
  normalized_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('ok', 'error', 'skipped', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_rows_batch ON import_rows(batch_id);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
