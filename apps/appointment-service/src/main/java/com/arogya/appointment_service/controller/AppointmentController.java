package com.arogya.appointment_service.controller;

import com.arogya.appointment_service.dto.request.BookAppointmentRequest;
import com.arogya.appointment_service.dto.request.CancelAppointmentRequest;
import com.arogya.appointment_service.dto.request.RescheduleAppointmentRequest;
import com.arogya.appointment_service.dto.response.AppointmentResponse;
import com.arogya.appointment_service.enums.AppointmentStatus;
import com.arogya.appointment_service.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * APT-02: POST   /api/appointments              → book appointment
 * APT-03: GET    /api/appointments/my           → list my appointments
 * APT-03: GET    /api/appointments/{id}         → view single appointment
 * APT-04: PATCH  /api/appointments/{id}/reschedule
 * APT-05: PATCH  /api/appointments/{id}/cancel
 * APT-06: GET    /api/appointments/{id}/status  → poll current status
 */
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    /** APT-02 */
    @PostMapping
    public ResponseEntity<AppointmentResponse> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request,
            Authentication auth) {

        String patientId = auth.getName(); // set by JwtAuthFilter from x-user-id
        AppointmentResponse response = appointmentService.bookAppointment(patientId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** APT-03 — list calling patient's own appointments */
    @GetMapping("/my")
    public ResponseEntity<List<AppointmentResponse>> getMyAppointments(Authentication auth) {
        return ResponseEntity.ok(appointmentService.getMyAppointments(auth.getName()));
    }

    /** APT-03 — view a single appointment (patient owns it, or doctor/admin) */
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointment(
            @PathVariable String id,
            Authentication auth) {

        String role = auth.getAuthorities().iterator().next().getAuthority()
                .replace("ROLE_", "");
        return ResponseEntity.ok(appointmentService.getAppointment(id, auth.getName(), role));
    }

    /**
     * APT-06: Polling endpoint for real-time status tracking.
     * Clients call this repeatedly to detect status changes (PENDING → CONFIRMED etc.)
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getStatus(
            @PathVariable String id,
            Authentication auth) {

        String role = auth.getAuthorities().iterator().next().getAuthority()
                .replace("ROLE_", "");
        AppointmentStatus status = appointmentService.getAppointmentStatus(id, auth.getName(), role);
        return ResponseEntity.ok(Map.of("appointmentId", id, "status", status.name()));
    }

    /** APT-04 */
    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponse> reschedule(
            @PathVariable String id,
            @Valid @RequestBody RescheduleAppointmentRequest request,
            Authentication auth) {

        return ResponseEntity.ok(
                appointmentService.rescheduleAppointment(id, auth.getName(), request));
    }

    /** APT-05 */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancel(
            @PathVariable String id,
            @RequestBody(required = false) CancelAppointmentRequest request,
            Authentication auth) {

        if (request == null) request = new CancelAppointmentRequest();
        return ResponseEntity.ok(
                appointmentService.cancelAppointment(id, auth.getName(), request));
    }
}
