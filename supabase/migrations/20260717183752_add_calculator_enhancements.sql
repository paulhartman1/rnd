-- Add new fields for calculator enhancements
ALTER TABLE calculator_defaults
  ADD COLUMN IF NOT EXISTS formula_mode TEXT NOT NULL DEFAULT 'simple' CHECK (formula_mode IN ('simple', 'detailed')),
  ADD COLUMN IF NOT EXISTS profit_type TEXT NOT NULL DEFAULT 'percentage' CHECK (profit_type IN ('fixed', 'percentage')),
  ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS arv_percentage NUMERIC(5, 2) NOT NULL DEFAULT 85.00;

-- Add comment explaining the new fields
COMMENT ON COLUMN calculator_defaults.formula_mode IS 'Calculator formula: simple (Dashaun) or detailed (LeadSharks)';
COMMENT ON COLUMN calculator_defaults.profit_type IS 'Profit calculation: fixed dollar amount or percentage of ARV';
COMMENT ON COLUMN calculator_defaults.profit_percentage IS 'Profit as percentage of ARV (used when profit_type = percentage)';
COMMENT ON COLUMN calculator_defaults.arv_percentage IS 'Percentage of ARV for offer calculation (typically 85%)';