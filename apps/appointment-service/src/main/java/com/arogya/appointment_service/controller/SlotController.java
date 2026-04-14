package com.arogya.appointment_service.controller;

import com.arogya.appointment_service.dto.response.SlotResponse;
import com.arogya.appointment_service.service.AppointmentSlotService;
import com.arogya.appointment_service.service.SlotGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * APT-01: Browse & search doctors by specialty/availability.
 *
 * GET  /api/appointments/slots                → all available slots
 * GET  /api/appointments/slots?doctorId=&date=→ slots for a specific doctor on a date
 * GET  /api/appointments/slots?specialty=&date=→ slots for doctors with given specialty
 * GET  /api/appointments/slots/{slotId}       → single slot detail
 * POST /api/appointments/slots/generate       → manually trigger slot generation (admin)
 *
 * All GET endpoints are public (no auth required) — see SecurityConfig.
 */
@RestController
@RequestMapping("/api/appointments/slots")
@RequiredArgsConstructor
public class SlotController {

    private final AppointmentSlotService slotService;
    private final SlotGenerationService  slotGenerationService;

    @GetMapping
    public ResponseEntity<List<SlotResponse>> searchSlots(
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(slotService.searchSlots(doctorId, specialty, date));
    }

    @GetMapping("/{slotId}")
    public ResponseEntity<SlotResponse> getSlot(@PathVariable String slotId) {
        return ResponseEntity.ok(slotService.getSlot(slotId));
    }

    /**
     * POST /api/appointments/slots/generate
     * Manually triggers slot generation for the next 30 days.
     * Protected at the gateway level (admin role required).
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Integer>> generateSlots() {
        int count = slotGenerationService.generateSlotsForNextDays(30);
        return ResponseEntity.ok(Map.of("generated", count));
    }

    /**
     * POST /api/appointments/slots/regenerate/{doctorId}
     * Called internally by doctor-service whenever a doctor adds or removes an
     * availability template.  Deletes that doctor's AVAILABLE slots and recreates
     * them from the latest templates so patients see the changes immediately.
     *
     * This endpoint is internal-only — the API gateway must not expose it publicly.
     */
    @PostMapping("/regenerate/{doctorId}")
    public ResponseEntity<Map<String, Integer>> regenerateSlotsForDoctor(@PathVariable String doctorId) {
        int count = slotGenerationService.generateSlotsForDoctor(doctorId);
        return ResponseEntity.ok(Map.of("generated", count));
    }
}
