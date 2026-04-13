package com.arogya.appointment_service.controller;

import com.arogya.appointment_service.dto.response.SlotResponse;
import com.arogya.appointment_service.service.AppointmentSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * APT-01: Browse & search doctors by specialty/availability.
 *
 * GET /api/appointments/slots                             → all available slots
 * GET /api/appointments/slots?doctorId=&date=            → slots for a specific doctor on a date
 * GET /api/appointments/slots?specialty=&date=           → slots for doctors with given specialty
 * GET /api/appointments/slots/{slotId}                   → single slot detail
 *
 * All GET /api/appointments/slots/** endpoints are public (no auth required) — see SecurityConfig.
 */
@RestController
@RequestMapping("/api/appointments/slots")
@RequiredArgsConstructor
public class SlotController {

    private final AppointmentSlotService slotService;

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
}
