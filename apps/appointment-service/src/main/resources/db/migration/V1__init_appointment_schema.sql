-- appointment_slots must exist before appointments references slot_id
CREATE TABLE appointment_slots (
    id          VARCHAR(36)    PRIMARY KEY,
    doctor_id   VARCHAR(36)    NOT NULL,
    start_time  TIMESTAMP      NOT NULL,
    end_time    TIMESTAMP      NOT NULL,
    fee         NUMERIC(10, 2) NOT NULL,
    status      VARCHAR(20)    NOT NULL DEFAULT 'AVAILABLE',
    version     BIGINT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE TABLE appointments (
    id                   VARCHAR(36)  PRIMARY KEY,
    patient_id           VARCHAR(36)  NOT NULL,
    doctor_id            VARCHAR(36)  NOT NULL,
    slot_id              VARCHAR(36)  NOT NULL,
    status               VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    appointment_type     VARCHAR(30)  NOT NULL DEFAULT 'PHYSICAL',
    payment_id           VARCHAR(36),
    meeting_url          TEXT,
    cancellation_reason  TEXT,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX idx_appointments_doctor_id  ON appointments (doctor_id);
CREATE INDEX idx_slots_doctor_id         ON appointment_slots (doctor_id);
