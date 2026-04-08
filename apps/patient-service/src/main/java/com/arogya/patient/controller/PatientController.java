package com.arogya.patient.controller;

import com.arogya.patient.dto.PatientDocumentResponse;
import com.arogya.patient.dto.PatientProfileResponse;
import com.arogya.patient.dto.CreatePatientProfileRequest;
import com.arogya.patient.dto.UpdatePatientProfileRequest;
import com.arogya.patient.service.PatientDocumentService;
import com.arogya.patient.service.PatientService;
import com.arogya.patient.web.AuthUserIdResolver;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/patients")
public class PatientController {

    private final PatientService patientService;
    private final PatientDocumentService patientDocumentService;
    private final AuthUserIdResolver authUserIdResolver;

    public PatientController(
            PatientService patientService,
            PatientDocumentService patientDocumentService,
            AuthUserIdResolver authUserIdResolver) {
        this.patientService = patientService;
        this.patientDocumentService = patientDocumentService;
        this.authUserIdResolver = authUserIdResolver;
    }

    @PostMapping("/profile")
    public ResponseEntity<PatientProfileResponse> createProfile(
            @RequestHeader(value = AuthUserIdResolver.AUTH_USER_ID_HEADER, required = false) UUID headerAuthUserId,
            @Valid @RequestBody CreatePatientProfileRequest request) {
        request.setAuthUserId(authUserIdResolver.resolveForCreate(headerAuthUserId, request.getAuthUserId()));
        PatientProfileResponse response = patientService.createPatientProfile(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/profile/me")
    public ResponseEntity<PatientProfileResponse> getOwnProfile(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId) {
        return ResponseEntity.ok(patientService.getPatientProfileByAuthUserId(authUserIdResolver.resolveRequired(authUserId)));
    }

    @GetMapping("/profile/{authUserId}")
    public ResponseEntity<PatientProfileResponse> getProfile(@PathVariable UUID authUserId) {
        return ResponseEntity.ok(patientService.getPatientProfileByAuthUserId(authUserId));
    }

    @PutMapping("/profile/me")
    public ResponseEntity<PatientProfileResponse> updateOwnProfile(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId,
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        return ResponseEntity.ok(patientService.updatePatientProfile(authUserIdResolver.resolveRequired(authUserId), request));
    }

    @PutMapping("/profile/{authUserId}")
    public ResponseEntity<PatientProfileResponse> updateProfile(
            @PathVariable UUID authUserId,
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        return ResponseEntity.ok(patientService.updatePatientProfile(authUserId, request));
    }

    @PostMapping(path = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PatientDocumentResponse> uploadOwnDocument(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        PatientDocumentResponse response = patientDocumentService.uploadDocument(
                authUserIdResolver.resolveRequired(authUserId), file, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(path = "/documents/{authUserId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PatientDocumentResponse> uploadDocument(
            @PathVariable UUID authUserId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        PatientDocumentResponse response = patientDocumentService.uploadDocument(authUserId, file, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/documents")
    public ResponseEntity<List<PatientDocumentResponse>> getOwnDocuments(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId) {
        return ResponseEntity.ok(patientDocumentService.getPatientDocuments(authUserIdResolver.resolveRequired(authUserId)));
    }

    @GetMapping("/documents/{authUserId}")
    public ResponseEntity<List<PatientDocumentResponse>> getDocuments(@PathVariable UUID authUserId) {
        return ResponseEntity.ok(patientDocumentService.getPatientDocuments(authUserId));
    }
}
