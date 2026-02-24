-- Migration 012: Onboarding Debts and Salaries

-- Extend public.accounts for credit card details
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS payment_day INT CHECK (payment_day >= 1 AND payment_day <= 31),
  ADD COLUMN IF NOT EXISTS card_payment_strategy TEXT CHECK (card_payment_strategy IN ('full', 'minimum', 'fixed')),
  ADD COLUMN IF NOT EXISTS minimum_payment_amount NUMERIC(15,2) CHECK (minimum_payment_amount >= 0);

-- Extend public.org_financial_profile for salary frequencies and details
ALTER TABLE public.org_financial_profile
  ADD COLUMN IF NOT EXISTS salary_frequency TEXT CHECK (salary_frequency IN ('monthly', 'biweekly')) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS salary_payment_day_1 INT CHECK (salary_payment_day_1 >= 1 AND salary_payment_day_1 <= 31),
  ADD COLUMN IF NOT EXISTS salary_payment_day_2 INT CHECK (salary_payment_day_2 >= 1 AND salary_payment_day_2 <= 31),
  ADD COLUMN IF NOT EXISTS first_fortnight_amount NUMERIC(15,2) CHECK (first_fortnight_amount >= 0),
  ADD COLUMN IF NOT EXISTS second_fortnight_amount NUMERIC(15,2) CHECK (second_fortnight_amount >= 0),
  ADD COLUMN IF NOT EXISTS partner_salary_frequency TEXT CHECK (partner_salary_frequency IN ('monthly', 'biweekly')) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS partner_salary_payment_day_1 INT CHECK (partner_salary_payment_day_1 >= 1 AND partner_salary_payment_day_1 <= 31),
  ADD COLUMN IF NOT EXISTS partner_salary_payment_day_2 INT CHECK (partner_salary_payment_day_2 >= 1 AND partner_salary_payment_day_2 <= 31),
  ADD COLUMN IF NOT EXISTS partner_first_fortnight_amount NUMERIC(15,2) CHECK (partner_first_fortnight_amount >= 0),
  ADD COLUMN IF NOT EXISTS partner_second_fortnight_amount NUMERIC(15,2) CHECK (partner_second_fortnight_amount >= 0);
