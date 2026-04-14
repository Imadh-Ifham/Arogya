-- Add email column to doctors table.
-- Used by notification-service to deliver doctor-targeted notifications
-- (e.g. "New appointment received") without routing through auth-service.
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
