-- Add doctor_name to appointment_slots so the slot response can carry the doctor's
-- display name without a cross-service call at query time.
-- Nullable because existing seed-inserted rows do not have this value.
ALTER TABLE appointment_slots
    ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
