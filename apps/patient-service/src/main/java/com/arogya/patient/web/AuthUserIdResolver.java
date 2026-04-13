package com.arogya.patient.web;

import com.arogya.patient.exception.MissingAuthUserIdException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AuthUserIdResolver {

    public static final String AUTH_USER_ID_HEADER = "x-user-id";
    public static final String AUTH_USER_ROLE_HEADER = "x-user-role";

    public UUID resolveRequired(UUID headerAuthUserId) {
        if (headerAuthUserId == null) {
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
