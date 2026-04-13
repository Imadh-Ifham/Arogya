-- 1. Create the main doctors table
CREATE TABLE doctors (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id VARCHAR(255),
    name VARCHAR(255),
    bio TEXT,
    consultation_fee DOUBLE PRECISION,
    license_number VARCHAR(255),
    qualifications VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'PENDING'
);

-- 2. Create the hidden table for the @ElementCollection List<String> languages
CREATE TABLE doctor_languages (
    doctor_id BIGINT NOT NULL,
    languages VARCHAR(255),
    CONSTRAINT fk_doctor_languages FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
);

-- 3. Create the reviews table
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT,
    rating INTEGER,
    comment TEXT,
    doctor_id BIGINT,
    CONSTRAINT fk_review_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
);

-- 4. Create the availability_templates table
CREATE TABLE availability_templates (
    id BIGSERIAL PRIMARY KEY,
    day_of_week VARCHAR(50),
    start_time TIME,
    end_time TIME,
    doctor_id BIGINT,
    CONSTRAINT fk_availability_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
);