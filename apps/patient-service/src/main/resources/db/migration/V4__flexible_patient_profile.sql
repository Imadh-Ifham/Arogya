-- Add personal info fields that come from the auth service side
ALTER TABLE patient_profiles ADD COLUMN first_name  VARCHAR(100);
ALTER TABLE patient_profiles ADD COLUMN last_name   VARCHAR(100);
ALTER TABLE patient_profiles ADD COLUMN phone_number VARCHAR(30);

-- Drop NOT NULL constraints so profiles can be created/updated incrementally
ALTER TABLE patient_profiles ALTER COLUMN date_of_birth          DROP NOT NULL;
ALTER TABLE patient_profiles ALTER COLUMN gender                  DROP NOT NULL;
ALTER TABLE patient_profiles ALTER COLUMN street_address          DROP NOT NULL;
ALTER TABLE patient_profiles ALTER COLUMN city                    DROP NOT NULL;
ALTER TABLE patient_profiles ALTER COLUMN emergency_contact_name         DROP NOT NULL;
ALTER TABLE patient_profiles ALTER COLUMN emergency_contact_phone        DROP NOT NULL;
ALTER TABLE patient_profiles ALTER COLUMN emergency_contact_relationship DROP NOT NULL;
