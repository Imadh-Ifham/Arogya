package com.arogya.appointment_service.controller;

import com.arogya.appointment_service.dto.response.AppointmentResponse;
import com.arogya.appointment_service.enums.AppointmentStatus;
import com.arogya.appointment_service.service.AdminAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Admin-only endpoints for appointment management.
 *
 * All routes under /api/appointments/admin/*.
 * The API Gateway enforces role=admin before forwarding here.
 * Spring Security additionally checks for ROLE_ADMIN via JwtAuthFilter headers.
 */
@RestController
@RequestMapping("/api/appointments/admin")
@RequiredArgsConstructor
public class AdminAppointmentController {

    private final AdminAppointmentService adminAppointmentService;

    /**
     * GET /api/appointments/admin/all
     * List all appointments across the platform.
     *
     * Query params:
     *   status   — filter by AppointmentStatus enum value
     *   doctorId — filter by doctor
     *   patientId — filter by patient
     *   from     — ISO date (YYYY-MM-DD), filter by slot date >= from
     *   to       — ISO date (YYYY-MM-DD), filter by slot date <= to
     *   page     — 1-indexed page number (default 1)
     *   size     — page size (default 20, max 100)
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllAppointments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {

        assertAdmin(auth);

        AppointmentStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try {
                statusFilter = AppointmentStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Unknown status value — treat as no filter
            }
        }

        int safePage = Math.max(page, 1);
        int safeSize = Math.min(size, 100);

        Map<String, Object> result = adminAppointmentService.getAllAppointments(
                statusFilter, doctorId, patientId, from, to, safePage, safeSize);

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/appointments/admin/{id}
     * View any single appointment (admin bypass — no ownership check).
     */
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointment(
            @PathVariable String id,
            Authentication auth) {

        assertAdmin(auth);
        return ResponseEntity.ok(adminAppointmentService.getAppointmentById(id));
    }

    /**
     * PATCH /api/appointments/admin/{id}/cancel
     * Admin-cancel any appointment regardless of current status.
     * Body: { "cancellationReason": "..." }
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {

        assertAdmin(auth);
        String reason = body != null ? body.getOrDefault("cancellationReason", "Cancelled by admin") : "Cancelled by admin";
        return ResponseEntity.ok(adminAppointmentService.adminCancelAppointment(id, reason));
    }

    /**
     * GET /api/appointments/admin/metrics
     * Returns appointment counts by status — used for the metrics dashboard.
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics(Authentication auth) {
        assertAdmin(auth);
        return ResponseEntity.ok(adminAppointmentService.getAppointmentMetrics());
    }

    // ─── Guard ────────────────────────────────────────────────────────────────────

    private void assertAdmin(Authentication auth) {
        if (auth == null) {
            throw new com.arogya.appointment_service.exception.UnauthorizedException("Not authenticated");
        }
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_ADMIN"));
        if (!isAdmin) {
            throw new com.arogya.appointment_service.exception.UnauthorizedException("Admin role required");
        }
    }
}
