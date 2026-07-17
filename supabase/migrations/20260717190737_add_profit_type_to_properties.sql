-- Add profit type fields to properties table
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS profit_type TEXT NOT NULL DEFAULT 'fixed' CHECK (profit_type IN ('fixed', 'percentage')),
  ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS formula_mode TEXT NOT NULL DEFAULT 'simple' CHECK (formula_mode IN ('simple', 'detailed')),
  ADD COLUMN IF NOT EXISTS arv_percentage NUMERIC(5, 2) DEFAULT 85.00;

-- Add comments
COMMENT ON COLUMN properties.profit_type IS 'How profit is calculated: fixed dollar amount or percentage of ARV';
COMMENT ON COLUMN properties.profit_percentage IS 'Profit as percentage of ARV (used when profit_type = percentage)';
COMMENT ON COLUMN properties.formula_mode IS 'Calculator formula used: simple (Dashaun) or detailed (LeadSharks)';
COMMENT ON COLUMN properties.arv_percentage IS 'Percentage of ARV for offer calculation (typically 85%)';