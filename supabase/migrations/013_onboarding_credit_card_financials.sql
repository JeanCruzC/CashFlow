-- Migration 013: Onboarding Credit Card Financials (TEA, Insurance)

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS tea NUMERIC(5, 2) CHECK (tea >= 0),
  ADD COLUMN IF NOT EXISTS has_desgravamen BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS desgravamen_amount NUMERIC(15, 2) DEFAULT 0 CHECK (desgravamen_amount >= 0);

-- Comentarios
COMMENT ON COLUMN public.accounts.tea IS 'Tasa Efectiva Anual (porcentaje, ej: 55.00)';
COMMENT ON COLUMN public.accounts.has_desgravamen IS 'Indica si la tarjeta realiza el cobro de seguro de desgravamen o comisiones fijas mensuales';
COMMENT ON COLUMN public.accounts.desgravamen_amount IS 'Monto aproximado que se cobra de seguro de desgravamen o comisiones (solo aplicable si es true)';
