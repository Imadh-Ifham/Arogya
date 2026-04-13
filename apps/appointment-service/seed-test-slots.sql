-- =============================================================================
-- Arogya — Test slot seed data
-- =============================================================================
-- Run against the arogya_appointments database:
--   docker exec -i arogya-postgres psql -U arogya -d arogya_appointments < apps/appointment-service/seed-test-slots.sql
--
-- Doctor UUIDs below match src/data/mockDoctors.ts in the web app.
-- =============================================================================

INSERT INTO appointment_slots (id, doctor_id, start_time, end_time, fee, status, version, created_at)
VALUES
  -- Dr. Arjun Mehta — Cardiology
  ('slot-0001-0000-0000-000000000001',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   NOW() + INTERVAL '1 day',
   NOW() + INTERVAL '1 day' + INTERVAL '30 minutes',
   800.00, 'AVAILABLE', 0, NOW()),

  ('slot-0001-0000-0000-000000000002',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   NOW() + INTERVAL '2 days',
   NOW() + INTERVAL '2 days' + INTERVAL '30 minutes',
   800.00, 'AVAILABLE', 0, NOW()),

  ('slot-0001-0000-0000-000000000003',
   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   NOW() + INTERVAL '3 days',
   NOW() + INTERVAL '3 days' + INTERVAL '30 minutes',
   800.00, 'AVAILABLE', 0, NOW()),

  -- Dr. Priya Nair — Dermatology
  ('slot-0002-0000-0000-000000000001',
   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   NOW() + INTERVAL '1 day' + INTERVAL '2 hours',
   NOW() + INTERVAL '1 day' + INTERVAL '2 hours 30 minutes',
   600.00, 'AVAILABLE', 0, NOW()),

  ('slot-0002-0000-0000-000000000002',
   'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   NOW() + INTERVAL '2 days' + INTERVAL '2 hours',
   NOW() + INTERVAL '2 days' + INTERVAL '2 hours 30 minutes',
   600.00, 'AVAILABLE', 0, NOW()),

  -- Dr. Sanjay Reddy — General Medicine
  ('slot-0003-0000-0000-000000000001',
   'c3d4e5f6-a7b8-9012-cdef-123456789012',
   NOW() + INTERVAL '1 day' + INTERVAL '4 hours',
   NOW() + INTERVAL '1 day' + INTERVAL '4 hours 30 minutes',
   400.00, 'AVAILABLE', 0, NOW()),

  ('slot-0003-0000-0000-000000000002',
   'c3d4e5f6-a7b8-9012-cdef-123456789012',
   NOW() + INTERVAL '2 days' + INTERVAL '4 hours',
   NOW() + INTERVAL '2 days' + INTERVAL '4 hours 30 minutes',
   400.00, 'AVAILABLE', 0, NOW()),

  ('slot-0003-0000-0000-000000000003',
   'c3d4e5f6-a7b8-9012-cdef-123456789012',
   NOW() + INTERVAL '4 days' + INTERVAL '4 hours',
   NOW() + INTERVAL '4 days' + INTERVAL '4 hours 30 minutes',
   400.00, 'AVAILABLE', 0, NOW())

ON CONFLICT (id) DO NOTHING;

SELECT
  id,
  doctor_id,
  start_time,
  fee,
  status
FROM appointment_slots
ORDER BY start_time;
