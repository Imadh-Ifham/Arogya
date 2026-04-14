-- Add checkout_url column to store the Stripe Checkout URL returned by payment-service.
-- This allows patients to return to an in-progress payment session without re-initiating.
ALTER TABLE appointments ADD COLUMN checkout_url TEXT;
