-- Migration 003: Transactions / Ledger

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('invoice', 'receipt', 'payment', 'journal_entry')),
  document_number TEXT,
  account_id UUID NOT NULL REFERENCES accounts(id),
  category_gl_id UUID REFERENCES categories_gl(id),
  counterparty_id UUID REFERENCES counterparties(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  project_id UUID,
  amount NUMERIC(15,2) NOT NULL CHECK (amount != 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_amount NUMERIC(15,2),
  is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_group_id UUID,
  detraccion_rate NUMERIC(5,2),
  detraccion_amount NUMERIC(15,2),
  status TEXT DEFAULT 'confirmed',
  attachment_url TEXT,
  import_batch_id UUID,
  external_id TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_org ON transactions(org_id);
CREATE INDEX idx_transactions_date ON transactions(org_id, date DESC);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_gl_id);
CREATE INDEX idx_transactions_external ON transactions(org_id, external_id);
CREATE INDEX idx_transactions_import ON transactions(import_batch_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
