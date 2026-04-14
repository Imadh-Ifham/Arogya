-- Auth service uses MongoDB ObjectIds (24-char hex) as user IDs, not UUIDs.
-- Widen the column so the patient service can store them as plain strings.
ALTER TABLE patients
    ALTER COLUMN auth_user_id TYPE VARCHAR(36) USING auth_user_id::text;
