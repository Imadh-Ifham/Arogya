-- Remove all manually seeded slots so the slot table starts fresh.
-- SlotGenerationService will repopulate it from doctor-service availability
-- templates on the next application startup (ApplicationReadyEvent) or
-- nightly run (01:00 cron), and any time a doctor updates their availability
-- via the /internal/slots/regenerate/{doctorId} endpoint.
TRUNCATE TABLE appointment_slots;
