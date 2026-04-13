package com.arogya.patient.controller;

import com.arogya.patient.client.PrescriptionClient;
import com.arogya.patient.domain.Patient;
import com.arogya.patient.dto.ApiResponse;
import com.arogya.patient.dto.PatientDashboardResponse;
import com.arogya.patient.dto.PatientDocumentResponse;
import com.arogya.patient.dto.PatientProfileResponse;
import com.arogya.patient.dto.PrescriptionDto;
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
    private final PrescriptionClient prescriptionClient;
    private final AuthUserIdResolver authUserIdResolver;

    public PatientController(
            PatientService patientService,
            PatientDocumentService patientDocumentService,
            PrescriptionClient prescriptionClient,
            AuthUserIdResolver authUserIdResolver) {
        this.patientService = patientService;
        this.patientDocumentService = patientDocumentService;
        this.prescriptionClient = prescriptionClient;
        this.authUserIdResolver = authUserIdResolver;
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    @PostMapping("/profile")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> createProfile(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID headerAuthUserId,
            @Valid @RequestBody CreatePatientProfileRequest request) {
        request.setAuthUserId(authUserIdResolver.resolveRequired(headerAuthUserId));
        PatientProfileResponse response = patientService.createPatientProfile(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/profile/me")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> getOwnProfile(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId) {
        PatientProfileResponse response = patientService.getPatientProfileByAuthUserId(
                authUserIdResolver.resolveRequired(authUserId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/profile/{authUserId}")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> getProfile(@PathVariable UUID authUserId) {
        return ResponseEntity.ok(ApiResponse.success(
                patientService.getPatientProfileByAuthUserId(authUserId)));
    }

    @PutMapping("/profile/me")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> updateOwnProfile(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId,
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        PatientProfileResponse response = patientService.updatePatientProfile(
                authUserIdResolver.resolveRequired(authUserId), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile/{authUserId}")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> updateProfile(
            @PathVariable UUID authUserId,
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                patientService.updatePatientProfile(authUserId, request)));
    }

    // ── Documents ─────────────────────────────────────────────────────────────

    @PostMapping(path = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PatientDocumentResponse>> uploadOwnDocument(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "documentType", required = false) String documentType) {
        PatientDocumentResponse response = patientDocumentService.uploadDocument(
                authUserIdResolver.resolveRequired(authUserId), file, description, documentType);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping(path = "/documents/{authUserId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PatientDocumentResponse>> uploadDocument(
            @PathVariable UUID authUserId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "documentType", required = false) String documentType) {
        PatientDocumentResponse response = patientDocumentService.uploadDocument(
                authUserId, file, description, documentType);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<List<PatientDocumentResponse>>> getOwnDocuments(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        List<PatientDocumentResponse> docs = patientDocumentService.getPatientDocuments(
                authUserIdResolver.resolveRequired(authUserId), type, from, to);
        return ResponseEntity.ok(ApiResponse.success(docs));
    }

    @GetMapping("/documents/{authUserId}")
    public ResponseEntity<ApiResponse<List<PatientDocumentResponse>>> getDocuments(
            @PathVariable UUID authUserId,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        return ResponseEntity.ok(ApiResponse.success(
                patientDocumentService.getPatientDocuments(authUserId, type, from, to)));
    }

    // ── Prescriptions ─────────────────────────────────────────────────────────

    @GetMapping("/me/prescriptions")
    public ResponseEntity<ApiResponse<List<PrescriptionDto>>> getOwnPrescriptions(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId) {
        Patient patient = patientService.getPatientByAuthUserId(
                authUserIdResolver.resolveRequired(authUserId));
        List<PrescriptionDto> prescriptions = prescriptionClient.getPrescriptionsForPatient(patient.getId());
        return ResponseEntity.ok(ApiResponse.success(prescriptions));
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @GetMapping("/me/dashboard")
    public ResponseEntity<ApiResponse<PatientDashboardResponse>> getOwnDashboard(
            @RequestHeader(AuthUserIdResolver.AUTH_USER_ID_HEADER) UUID authUserId) {
        UUID resolvedUserId = authUserIdResolver.resolveRequired(authUserId);

        // Fetch patient entity once — reused across all three data sources
        Patient patient = patientService.getPatientByAuthUserId(resolvedUserId);

        PatientProfileResponse profile = patientService.getPatientProfileByAuthUserId(resolvedUserId);
        List<PatientDocumentResponse> documents = patientDocumentService.getPatientDocuments(
                resolvedUserId, null, null, null);
        List<PrescriptionDto> prescriptions = prescriptionClient.getPrescriptionsForPatient(patient.getId());

        PatientDashboardResponse dashboard = new PatientDashboardResponse(profile, documents, prescriptions);
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }
}
