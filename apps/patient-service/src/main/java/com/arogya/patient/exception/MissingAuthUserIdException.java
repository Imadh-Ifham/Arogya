package com.arogya.patient.exception;

public class MissingAuthUserIdException extends RuntimeException {

    public MissingAuthUserIdException(String message) {
        super(message);
    }
}
