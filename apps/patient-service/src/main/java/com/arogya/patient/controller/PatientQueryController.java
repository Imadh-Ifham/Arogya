package com.arogya.patient.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arogya.patient.dto.MessageResponse;
import com.arogya.patient.service.PatientService;
import com.arogya.patient.web.AuthUserIdResolver;

@RestController
@RequestMapping("/patients")
public class PatientQueryController {

    private final PatientService patientService;
    private final AuthUserIdResolver authUserIdResolver;

    public PatientQueryController(PatientService patientService, AuthUserIdResolver authUserIdResolver) {
        this.patientService = patientService;
        this.authUserIdResolver = authUserIdResolver;
    }

    @GetMapping("/exists/me")
    public ResponseEntity<MessageResponse> patientExistsForCurrentUser(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) String authUserId) {
        String resolvedAuthUserId = authUserIdResolver.resolveRequired(authUserId);
        boolean exists = patientService.patientExists(resolvedAuthUserId);
        String message = exists
                ? "Patient exists for auth user id: " + resolvedAuthUserId
                : "Patient does not exist for auth user id: " + resolvedAuthUserId;
        return ResponseEntity.ok(new MessageResponse(message));
    }

    @GetMapping("/exists/{authUserId}")
    public ResponseEntity<MessageResponse> patientExists(@PathVariable String authUserId) {
        boolean exists = patientService.patientExists(authUserId);
        String message = exists
                ? "Patient exists for auth user id: " + authUserId
                : "Patient does not exist for auth user id: " + authUserId;
        return ResponseEntity.ok(new MessageResponse(message));
    }
}
