-- Create calculator_defaults table for storing default calculator values
CREATE TABLE IF NOT EXISTS calculator_defaults (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single-row table
  
  -- Market Value
  as_is_market_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  percent_of_market_value NUMERIC(5, 2) NOT NULL DEFAULT 95,
  
  -- Percentage-based Costs
  realtor_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 3,
  double_close_fee_percent NUMERIC(5, 4) NOT NULL DEFAULT 0.75,
  
  -- Fixed Costs
  closing_attorney_fee NUMERIC(10, 2) NOT NULL DEFAULT 500,
  title_insurance NUMERIC(10, 2) NOT NULL DEFAULT 500,
  efile_fee NUMERIC(10, 2) NOT NULL DEFAULT 100,
  recording_fee NUMERIC(10, 2) NOT NULL DEFAULT 100,
  transfer_tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
  flat_fee_listing NUMERIC(10, 2) NOT NULL DEFAULT 400,
  photographer_fee NUMERIC(10, 2) NOT NULL DEFAULT 150,
  other_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Repair & Interest
  repair_costs NUMERIC(10, 2) NOT NULL DEFAULT 0,
  interest_costs NUMERIC(10, 2) NOT NULL DEFAULT 0,
  months_held INTEGER NOT NULL DEFAULT 6,
  
  -- Desired Profit
  desired_profit_access NUMERIC(10, 2) NOT NULL DEFAULT 30000,
  desired_profit_no_access NUMERIC(10, 2) NOT NULL DEFAULT 35000,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_calculator_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculator_defaults_updated_at
  BEFORE UPDATE ON calculator_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_defaults_updated_at();

-- Insert default row
INSERT INTO calculator_defaults (id) 
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE calculator_defaults ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read defaults
CREATE POLICY "Allow authenticated users to read calculator defaults"
  ON calculator_defaults
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update defaults
CREATE POLICY "Allow authenticated users to update calculator defaults"
  ON calculator_defaults
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);