-- Add voicemail_voice column to phone_settings
ALTER TABLE phone_settings
ADD COLUMN voicemail_voice TEXT DEFAULT 'Polly.Matthew';

COMMENT ON COLUMN phone_settings.voicemail_voice IS 'Twilio voice to use for reading voicemail message (e.g., Polly.Matthew, Polly.Joanna)';

-- Update existing row to have default voice if null
UPDATE phone_settings
SET voicemail_voice = 'Polly.Matthew'
WHERE voicemail_voice IS NULL;
