-- Add reason column to blackout_periods table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blackout_periods' 
    AND column_name = 'reason'
  ) THEN
    ALTER TABLE public.blackout_periods ADD COLUMN reason text;
  END IF;
END $$;

-- Make reason nullable
ALTER TABLE public.blackout_periods
ALTER COLUMN reason DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.blackout_periods.reason IS 'Optional reason or note for why this time period is blocked out';
