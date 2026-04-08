package com.arogya.patient.web;

import com.arogya.patient.exception.MissingAuthUserIdException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AuthUserIdResolver {

    public static final String AUTH_USER_ID_HEADER = "x-auth-user-id";

    public UUID resolveRequired(UUID headerAuthUserId) {
        if (headerAuthUserId == null) {
            throw new MissingAuthUserIdException(
                    "Missing auth user id. Provide x-auth-user-id header.");
        }
        return headerAuthUserId;
    }

    public UUID resolveForCreate(UUID headerAuthUserId, UUID requestAuthUserId) {
        if (headerAuthUserId != null) {
            return headerAuthUserId;
        }
        if (requestAuthUserId != null) {
            return requestAuthUserId;
        }
        throw new MissingAuthUserIdException(
                "Missing auth user id. Provide x-auth-user-id header or authUserId in request body.");
    }
}
