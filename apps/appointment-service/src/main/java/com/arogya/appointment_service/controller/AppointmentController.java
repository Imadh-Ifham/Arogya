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
 * APT-02: POST   /api/appointments                      → book appointment (returns checkoutUrl for PHYSICAL)
 * APT-03: GET    /api/appointments/my                   → list my appointments
 * APT-03: GET    /api/appointments/{id}                 → view single appointment
 * APT-04: PATCH  /api/appointments/{id}/reschedule
 * APT-05: PATCH  /api/appointments/{id}/cancel
 * APT-06: GET    /api/appointments/{id}/status          → poll current status
 *         POST   /api/appointments/{id}/payment-confirmed   → internal: payment-service callback
 *         PATCH  /api/appointments/{id}/accept          → doctor accepts
 *         PATCH  /api/appointments/{id}/reject          → doctor rejects
 *         GET    /api/appointments/doctor               → doctor dashboard
 */
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    // ─── Patient endpoints ────────────────────────────────────────────────────

    /** APT-02 — book an appointment; response includes checkoutUrl for PHYSICAL type */
    @PostMapping
    public ResponseEntity<AppointmentResponse> bookAppointment(
            @Valid @RequestBody BookAppointmentRequest request,
            Authentication auth) {

        String patientId = auth.getName();
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

        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        return ResponseEntity.ok(appointmentService.getAppointment(id, auth.getName(), role));
    }

    /** APT-06 — polling endpoint for real-time status tracking */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getStatus(
            @PathVariable String id,
            Authentication auth) {

        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
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

    // ─── Internal service-to-service endpoints ────────────────────────────────

    /**
     * Called exclusively by payment-service after the Stripe webhook confirms payment.
     *
     * This endpoint is INTERNAL — it must not be exposed through the public API Gateway.
     * No JWT token is required; it relies on network-level isolation (Docker internal network).
     *
     * Request body: { "paymentId": "pay_xxx" }
     * On success:   appointment status → PAYMENT_COMPLETED
     *               notifications sent to patient + doctor
     */
    @PostMapping("/{id}/payment-confirmed")
    public ResponseEntity<AppointmentResponse> paymentConfirmed(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {

        String paymentId = body.get("paymentId");
        AppointmentResponse response = appointmentService.confirmPayment(id, paymentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Called by payment-service when the Stripe checkout session expires or payment fails.
     *
     * Rolls appointment back to PENDING so the patient can retry.
     * This endpoint is INTERNAL — not exposed via the public API Gateway.
     */
    @PostMapping("/{id}/payment-failed")
    public ResponseEntity<Void> paymentFailed(@PathVariable String id) {
        appointmentService.handlePaymentFailed(id);
        return ResponseEntity.ok().build();
    }

    // ─── Doctor endpoints ─────────────────────────────────────────────────────

    /**
     * Doctor accepts an appointment (DOCTOR/ADMIN only).
     * Guard: appointment must be in PAYMENT_COMPLETED status.
     * Transition: PAYMENT_COMPLETED → ACCEPTED
     */
    @PatchMapping("/{id}/accept")
    public ResponseEntity<AppointmentResponse> acceptAppointment(
            @PathVariable String id,
            Authentication auth) {

        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        if (!"DOCTOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.acceptAppointment(id, auth.getName()));
    }

    /**
     * Doctor rejects an appointment (DOCTOR/ADMIN only).
     * Guard: appointment must be in PAYMENT_COMPLETED status.
     * Transition: PAYMENT_COMPLETED → REJECTED; slot released.
     */
    @PatchMapping("/{id}/reject")
    public ResponseEntity<AppointmentResponse> rejectAppointment(
            @PathVariable String id,
            Authentication auth) {

        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        if (!"DOCTOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.rejectAppointment(id, auth.getName()));
    }

    /** Doctor views all their appointments (doctor dashboard). */
    @GetMapping("/doctor")
    public ResponseEntity<List<AppointmentResponse>> getDoctorAppointments(Authentication auth) {
        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        if (!"DOCTOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(auth.getName()));
    }
}
