package com.arogya.doctor_service.controller;

import com.arogya.doctor_service.client.AppointmentServiceClient;
import com.arogya.doctor_service.dto.DoctorSummaryDto;
import com.arogya.doctor_service.model.*;
import com.arogya.doctor_service.service.DoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;
    private final AppointmentServiceClient appointmentClient;

    public DoctorController(DoctorService doctorService, AppointmentServiceClient appointmentClient) {
        this.doctorService = doctorService;
        this.appointmentClient = appointmentClient;
    }

    /**
     * List / search approved doctors.
     * GET /api/doctors                        → all approved doctors
     * GET /api/doctors?specialty=Cardiology   → approved doctors by specialty
     *
     * Called by appointment-service DoctorServiceClient to resolve doctor IDs.
     */
    @GetMapping
    public ResponseEntity<List<DoctorSummaryDto>> getDoctors(
            @RequestParam(required = false) String specialty) {
        List<DoctorSummaryDto> result = doctorService.getDoctors(specialty)
                .stream()
                .map(DoctorSummaryDto::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Register a new doctor profile.
     * The authenticated user's ID is forwarded by the API gateway as x-user-id header.
     */
    @PostMapping("/register")
    public ResponseEntity<Doctor> register(
            @RequestBody Doctor doctor,
            @RequestHeader(value = "x-user-id", required = false) String authUserId) {
        if (authUserId != null && !authUserId.isBlank()) {
            doctor.setAuthUserId(authUserId);
        }
        return ResponseEntity.ok(doctorService.registerDoctor(doctor));
    }

    /**
     * GET /api/doctors/me — returns the authenticated doctor's profile.
     * If no doctor entity exists yet for this auth user (e.g. registerDoctor silently failed
     * during sign-up), returns a 200 with a stub DTO so the frontend can still display the
     * profile form. The doctor can then save via PUT /me which will create the record.
     * NOTE: Must be declared before /{id} so "me" is not treated as a path variable.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(
            @RequestHeader(value = "x-user-id", required = false) String authUserId) {
        if (authUserId == null || authUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        return doctorService.getDoctorByAuthUserId(authUserId)
                .map(doctor -> ResponseEntity.<Object>ok(DoctorSummaryDto.from(doctor)))
                // Return a stub 200 (not 404) so the profile page still loads.
                // id=null signals "not yet registered in doctor service".
                .orElseGet(() -> ResponseEntity.ok(
                        new DoctorSummaryDto(null, authUserId, null, null, null, null, null, null, null, "PENDING", 0.0)
                ));
    }

    /**
     * PUT /api/doctors/me — upserts the authenticated doctor's profile.
     * Creates the doctor entity if it doesn't exist yet, then applies the provided fields.
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(
            @RequestHeader(value = "x-user-id", required = false) String authUserId,
            @RequestBody Doctor updates) {
        if (authUserId == null || authUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        Doctor saved = doctorService.upsertDoctorProfile(authUserId, updates);
        return ResponseEntity.ok(DoctorSummaryDto.from(saved));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorSummaryDto> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(DoctorSummaryDto.from(doctorService.getDoctorProfile(id)));
    }

    /**
     * Internal service-to-service endpoint: resolve a doctor by their auth user ID.
     * Used by notification-service to look up the doctor's email for outbound notifications.
     * NOTE: Must be declared before /{id} so Spring maps it correctly.
     */
    @GetMapping("/by-auth/{authUserId}")
    public ResponseEntity<?> getByAuthUserId(@PathVariable String authUserId) {
        return doctorService.getDoctorByAuthUserId(authUserId)
                .map(doctor -> ResponseEntity.<Object>ok(DoctorSummaryDto.from(doctor)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reviews")
    public Review addReview(@PathVariable Long id, @RequestBody Review review) {
        return doctorService.addReview(id, review);
    }

    /**
     * GET /api/doctors/{id}/availability — list all weekly availability templates for a doctor.
     */
    @GetMapping("/{id}/availability")
    public ResponseEntity<List<AvailabilityTemplate>> getAvailability(@PathVariable Long id) {
        return ResponseEntity.ok(doctorService.getAvailability(id));
    }

    /**
     * POST /api/doctors/{id}/availability — add a weekly availability slot.
     * Triggers immediate slot regeneration in appointment-service so patients
     * see the new slots without waiting for the nightly cron.
     */
    @PostMapping("/{id}/availability")
    public AvailabilityTemplate addAvailability(@PathVariable Long id, @RequestBody AvailabilityTemplate template) {
        AvailabilityTemplate saved = doctorService.addAvailability(id, template);
        appointmentClient.regenerateSlots(String.valueOf(id));
        return saved;
    }

    /**
     * DELETE /api/doctors/{id}/availability/{templateId} — remove a weekly availability slot.
     * Triggers immediate slot regeneration so removed templates no longer appear to patients.
     */
    @DeleteMapping("/{id}/availability/{templateId}")
    public ResponseEntity<Void> deleteAvailability(
            @PathVariable Long id,
            @PathVariable Long templateId) {
        doctorService.deleteAvailability(id, templateId);
        appointmentClient.regenerateSlots(String.valueOf(id));
        return ResponseEntity.noContent().build();
    }
}
