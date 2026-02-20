-- Migration 002: Accounts, Categories/GL, Cost Centers, Counterparties

CREATE TYPE account_type AS ENUM ('cash', 'bank', 'credit_card', 'loan', 'investment');
CREATE TYPE counterparty_type AS ENUM ('customer', 'vendor', 'other');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_limit NUMERIC(15,2),
  interest_rate_apr NUMERIC(5,2),
  is_restricted_cash BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_org ON accounts(org_id);

CREATE TABLE categories_gl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'income', 'expense', 'transfer',
    'revenue', 'cogs', 'opex', 'other_income', 'other_expense', 'tax'
  )),
  fixed_cost BOOLEAN NOT NULL DEFAULT FALSE,
  variable_cost BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_gl_org ON categories_gl(org_id);

CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_centers_org ON cost_centers(org_id);

CREATE TABLE counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type counterparty_type NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  tax_id TEXT,
  payment_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_counterparties_org ON counterparties(org_id);
