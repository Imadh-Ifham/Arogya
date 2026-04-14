-- payment_id stores values like "pay_<uuid>" which exceeds VARCHAR(36).
-- Widen to TEXT to accommodate any payment gateway identifier format.
ALTER TABLE appointments ALTER COLUMN payment_id TYPE TEXT;
