-- Migration 006: Seed default category templates
-- These are inserted per-org during onboarding, not globally

-- Function to seed personal categories for a new org
CREATE OR REPLACE FUNCTION seed_personal_categories(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categories_gl (org_id, name, kind, sort_order) VALUES
    -- Income
    (p_org_id, 'Salary', 'income', 1),
    (p_org_id, 'Freelance', 'income', 2),
    (p_org_id, 'Investments', 'income', 3),
    (p_org_id, 'Rental Income', 'income', 4),
    (p_org_id, 'Other Income', 'income', 5),
    -- Expenses
    (p_org_id, 'Housing', 'expense', 10),
    (p_org_id, 'Utilities', 'expense', 11),
    (p_org_id, 'Groceries', 'expense', 12),
    (p_org_id, 'Transportation', 'expense', 13),
    (p_org_id, 'Healthcare', 'expense', 14),
    (p_org_id, 'Insurance', 'expense', 15),
    (p_org_id, 'Education', 'expense', 16),
    (p_org_id, 'Entertainment', 'expense', 17),
    (p_org_id, 'Dining Out', 'expense', 18),
    (p_org_id, 'Shopping', 'expense', 19),
    (p_org_id, 'Subscriptions', 'expense', 20),
    (p_org_id, 'Personal Care', 'expense', 21),
    (p_org_id, 'Debt Payments', 'expense', 22),
    (p_org_id, 'Savings', 'expense', 23),
    (p_org_id, 'Other Expenses', 'expense', 24),
    -- Transfers
    (p_org_id, 'Transfer', 'transfer', 30);
END;
$$ LANGUAGE plpgsql;

-- Function to seed business categories for a new org
CREATE OR REPLACE FUNCTION seed_business_categories(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categories_gl (org_id, name, kind, fixed_cost, variable_cost, sort_order) VALUES
    -- Revenue
    (p_org_id, 'Product Sales', 'revenue', FALSE, FALSE, 1),
    (p_org_id, 'Service Revenue', 'revenue', FALSE, FALSE, 2),
    (p_org_id, 'Subscription Revenue', 'revenue', FALSE, FALSE, 3),
    (p_org_id, 'Other Revenue', 'revenue', FALSE, FALSE, 4),
    -- COGS
    (p_org_id, 'Raw Materials', 'cogs', FALSE, TRUE, 10),
    (p_org_id, 'Direct Labor', 'cogs', FALSE, TRUE, 11),
    (p_org_id, 'Manufacturing Overhead', 'cogs', TRUE, FALSE, 12),
    (p_org_id, 'Shipping & Fulfillment', 'cogs', FALSE, TRUE, 13),
    -- OPEX Fixed
    (p_org_id, 'Rent & Facilities', 'opex', TRUE, FALSE, 20),
    (p_org_id, 'Salaries & Benefits', 'opex', TRUE, FALSE, 21),
    (p_org_id, 'Insurance', 'opex', TRUE, FALSE, 22),
    (p_org_id, 'Software & Tools', 'opex', TRUE, FALSE, 23),
    (p_org_id, 'Professional Services', 'opex', TRUE, FALSE, 24),
    (p_org_id, 'Depreciation', 'opex', TRUE, FALSE, 25),
    -- OPEX Variable
    (p_org_id, 'Marketing & Advertising', 'opex', FALSE, TRUE, 30),
    (p_org_id, 'Sales Commissions', 'opex', FALSE, TRUE, 31),
    (p_org_id, 'Travel & Entertainment', 'opex', FALSE, TRUE, 32),
    (p_org_id, 'Office Supplies', 'opex', FALSE, TRUE, 33),
    (p_org_id, 'Utilities', 'opex', FALSE, TRUE, 34),
    -- Tax
    (p_org_id, 'Income Tax', 'tax', FALSE, FALSE, 40),
    (p_org_id, 'Sales Tax / VAT', 'tax', FALSE, FALSE, 41),
    -- Transfer
    (p_org_id, 'Internal Transfer', 'transfer', FALSE, FALSE, 50);
END;
$$ LANGUAGE plpgsql;

-- Function to seed default cost centers for business
CREATE OR REPLACE FUNCTION seed_business_cost_centers(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO cost_centers (org_id, name) VALUES
    (p_org_id, 'Operations'),
    (p_org_id, 'Commercial'),
    (p_org_id, 'Administration');
END;
$$ LANGUAGE plpgsql;
