CREATE TABLE patients (
    id UUID PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10),
    height_cm INT,
    weight_kg INT,
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_contact_phone VARCHAR(30) NOT NULL,
    emergency_contact_relationship VARCHAR(50) NOT NULL,
    known_allergies TEXT,
    medical_conditions TEXT,
    current_medications TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_profile_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
);

CREATE TABLE patient_documents (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_document_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_patient_documents_patient_id
    ON patient_documents(patient_id);
