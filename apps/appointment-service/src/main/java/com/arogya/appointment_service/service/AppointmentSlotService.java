package com.arogya.appointment_service.service;

import com.arogya.appointment_service.client.DoctorServiceClient;
import com.arogya.appointment_service.dto.response.SlotResponse;
import com.arogya.appointment_service.entity.AppointmentSlot;
import com.arogya.appointment_service.enums.SlotStatus;
import com.arogya.appointment_service.exception.AppointmentNotFoundException;
import com.arogya.appointment_service.repository.AppointmentSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * APT-01: Browse & search doctors by specialty/availability.
 * Slots are owned by the appointment-service; doctors live in doctor-service.
 * We support three filter combinations:
 *   1. doctorId + date  → slots for that doctor on that day
 *   2. specialty + date → call doctor-service for matching IDs, then filter slots
 *   3. no filters       → all AVAILABLE slots (paginated in a future iteration)
 */
@Service
@RequiredArgsConstructor
public class AppointmentSlotService {

    private final AppointmentSlotRepository slotRepository;
    private final DoctorServiceClient doctorServiceClient;

    public List<SlotResponse> searchSlots(String doctorId, String specialty, LocalDate date) {
        SlotStatus available = SlotStatus.AVAILABLE;

        // Filter by a specific doctor + date
        if (doctorId != null && date != null) {
            LocalDateTime from = date.atStartOfDay();
            LocalDateTime to   = date.plusDays(1).atStartOfDay();
            return slotRepository
                    .findByDoctorIdAndStatusAndStartTimeBetween(doctorId, available, from, to)
                    .stream().map(SlotResponse::from).toList();
        }

        // Filter by specialty + date — resolve doctor IDs via doctor-service
        if (specialty != null && date != null) {
            List<String> doctorIds = doctorServiceClient.getDoctorIdsBySpecialty(specialty);
            if (doctorIds.isEmpty()) return List.of();
            LocalDateTime from = date.atStartOfDay();
            LocalDateTime to   = date.plusDays(1).atStartOfDay();
            return slotRepository
                    .findByDoctorIdInAndStatusAndStartTimeBetween(doctorIds, available, from, to)
                    .stream().map(SlotResponse::from).toList();
        }

        // Filter by doctor only (all upcoming slots)
        if (doctorId != null) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime future = now.plusDays(30);
            return slotRepository
                    .findByDoctorIdAndStatusAndStartTimeBetween(doctorId, available, now, future)
                    .stream().map(SlotResponse::from).toList();
        }

        // No filters — return all available slots
        return slotRepository.findByStatus(available)
                .stream().map(SlotResponse::from).toList();
    }

    public SlotResponse getSlot(String slotId) {
        AppointmentSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new AppointmentNotFoundException("Slot not found: " + slotId));
        return SlotResponse.from(slot);
    }

    // Internal use only — called by AppointmentService during booking / rescheduling
    public AppointmentSlot getAvailableSlotForBooking(String slotId) {
        AppointmentSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new AppointmentNotFoundException("Slot not found: " + slotId));
        if (slot.getStatus() != SlotStatus.AVAILABLE) {
            throw new com.arogya.appointment_service.exception.SlotNotAvailableException(
                    "Slot " + slotId + " is not available (status: " + slot.getStatus() + ")");
        }
        return slot;
    }
}
