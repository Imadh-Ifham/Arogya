package com.arogya.doctor_service.controller;

import com.arogya.doctor_service.dto.DoctorSummaryDto;
import com.arogya.doctor_service.model.*;
import com.arogya.doctor_service.service.DoctorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
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

    @GetMapping("/{id}")
    public Doctor getProfile(@PathVariable Long id) {
        return doctorService.getDoctorProfile(id);
    }

    @PostMapping("/{id}/reviews")
    public Review addReview(@PathVariable Long id, @RequestBody Review review) {
        return doctorService.addReview(id, review);
    }

    @PostMapping("/{id}/availability")
    public AvailabilityTemplate addAvailability(@PathVariable Long id, @RequestBody AvailabilityTemplate template) {
        return doctorService.addAvailability(id, template);
    }
}
