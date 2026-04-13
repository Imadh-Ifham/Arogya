package com.arogya.patient.web;

import org.springframework.stereotype.Component;

import com.arogya.patient.exception.MissingAuthUserIdException;

@Component
public class AuthUserIdResolver {

    public static final String AUTH_USER_ID_HEADER = "x-user-id";
    public static final String AUTH_USER_ROLE_HEADER = "x-user-role";

    public String resolveRequired(String headerAuthUserId) {
        if (headerAuthUserId == null || headerAuthUserId.isBlank()) {
            throw new MissingAuthUserIdException(
                    "Missing required header: x-user-id");
        }
        return headerAuthUserId;
    }

    public String resolveRole(String role) {
        if (role == null || role.isBlank()) {
            throw new MissingAuthUserIdException(
                    "Missing required header: x-user-role");
        }
        return role;
    }
}
