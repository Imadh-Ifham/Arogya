package com.arogya.patient.exception;

public class PatientProfileNotFoundException extends RuntimeException {

    public PatientProfileNotFoundException(String message) {
        super(message);
    }
}
