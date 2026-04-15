package com.arogya.appointment_service.service;

import com.arogya.appointment_service.dto.response.AppointmentResponse;
import com.arogya.appointment_service.entity.Appointment;
import com.arogya.appointment_service.entity.AppointmentSlot;
import com.arogya.appointment_service.enums.AppointmentStatus;
import com.arogya.appointment_service.enums.SlotStatus;
import com.arogya.appointment_service.exception.AppointmentNotFoundException;
import com.arogya.appointment_service.repository.AppointmentRepository;
import com.arogya.appointment_service.repository.AppointmentSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentSlotRepository slotRepository;

    /**
     * List all appointments with optional filtering and in-memory pagination.
     *
     * Filters applied:
     *  - status   → matches appointment.status
     *  - doctorId → exact match
     *  - patientId → exact match
     *  - from/to  → compared against the slot's startTime date
     *
     * Enriches each response with doctorName from the linked slot.
     */
    public Map<String, Object> getAllAppointments(
            AppointmentStatus status,
            String doctorId,
            String patientId,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {

        // Fetch all appointments (JPA does not have a dynamic predicate builder
        // without Specifications; to keep this consistent with the rest of the
        // codebase we filter in Java after fetching — acceptable for admin use).
        List<Appointment> all = appointmentRepository.findAll();

        // Resolve all slot IDs in one batch query for efficiency
        Set<String> slotIds = all.stream().map(Appointment::getSlotId).collect(Collectors.toSet());
        Map<String, AppointmentSlot> slotMap = slotRepository.findAllById(slotIds)
                .stream().collect(Collectors.toMap(AppointmentSlot::getId, s -> s));

        // Apply filters
        List<Appointment> filtered = all.stream()
                .filter(a -> status == null || a.getStatus() == status)
                .filter(a -> doctorId == null || doctorId.isBlank() || doctorId.equals(a.getDoctorId()))
                .filter(a -> patientId == null || patientId.isBlank() || patientId.equals(a.getPatientId()))
                .filter(a -> {
                    if (from == null && to == null) return true;
                    AppointmentSlot slot = slotMap.get(a.getSlotId());
                    if (slot == null || slot.getStartTime() == null) return false;
                    LocalDate slotDate = slot.getStartTime().toLocalDate();
                    if (from != null && slotDate.isBefore(from)) return false;
                    if (to != null && slotDate.isAfter(to)) return false;
                    return true;
                })
                .sorted(Comparator.comparing(Appointment::getCreatedAt).reversed())
                .collect(Collectors.toList());

        // Paginate
        int total = filtered.size();
        int skip = (page - 1) * size;
        List<Appointment> page_items = filtered.stream()
                .skip(skip)
                .limit(size)
                .collect(Collectors.toList());

        // Build responses
        List<AppointmentResponse> responses = page_items.stream()
                .map(a -> {
                    AppointmentSlot slot = slotMap.get(a.getSlotId());
                    String doctorName = slot != null ? slot.getDoctorName() : null;
                    return AppointmentResponse.from(a, doctorName, null);
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("appointments", responses);
        result.put("total", total);
        result.put("page", page);
        result.put("size", size);
        result.put("totalPages", (int) Math.ceil((double) total / size));
        return result;
    }

    /**
     * Fetch a single appointment by ID — admin bypass (no ownership check).
     */
    public AppointmentResponse getAppointmentById(String id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + id));
        AppointmentSlot slot = slotRepository.findById(appointment.getSlotId()).orElse(null);
        String doctorName = slot != null ? slot.getDoctorName() : null;
        return AppointmentResponse.from(appointment, doctorName, null);
    }

    /**
     * Admin cancel — bypasses ownership check and works on any status except COMPLETED.
     * Releases the slot back to AVAILABLE so it can be re-booked.
     */
    @Transactional
    public AppointmentResponse adminCancelAppointment(String id, String reason) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found: " + id));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            return AppointmentResponse.from(appointment);
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed appointment");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationReason(reason != null ? reason : "Cancelled by admin");

        // Release slot
        slotRepository.findById(appointment.getSlotId()).ifPresent(slot -> {
            slot.setStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        });

        log.info("Admin cancelled appointment {}: {}", id, reason);
        return AppointmentResponse.from(appointmentRepository.save(appointment));
    }

    /**
     * Returns appointment counts grouped by status — used for the admin metrics dashboard.
     */
    public Map<String, Object> getAppointmentMetrics() {
        List<Appointment> all = appointmentRepository.findAll();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (AppointmentStatus s : AppointmentStatus.values()) {
            byStatus.put(s.name(), 0L);
        }
        for (Appointment a : all) {
            byStatus.merge(a.getStatus().name(), 1L, Long::sum);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", (long) all.size());
        result.put("byStatus", byStatus);
        return result;
    }
}
