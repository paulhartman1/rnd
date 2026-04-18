-- Ensure phone_settings is a singleton table (only one row)
-- Delete all but the most recent row
DELETE FROM phone_settings
WHERE id NOT IN (
  SELECT id FROM phone_settings
  ORDER BY updated_at DESC
  LIMIT 1
);

-- Add a check constraint to prevent multiple rows
CREATE OR REPLACE FUNCTION ensure_single_phone_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM phone_settings) >= 1 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Only one row allowed in phone_settings table';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phone_settings_singleton ON phone_settings;
CREATE TRIGGER phone_settings_singleton
  BEFORE INSERT ON phone_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_phone_settings();

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phone_settings_updated_at ON phone_settings;
CREATE TRIGGER phone_settings_updated_at
  BEFORE UPDATE ON phone_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
