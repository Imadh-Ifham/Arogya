package com.arogya.appointment_service.service;

import com.arogya.appointment_service.client.DoctorServiceClient;
import com.arogya.appointment_service.entity.AppointmentSlot;
import com.arogya.appointment_service.enums.SlotStatus;
import com.arogya.appointment_service.repository.AppointmentSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Generates concrete AppointmentSlot rows from each approved doctor's weekly
 * availability templates stored in doctor-service.
 *
 * Runs automatically:
 *   1. Once after the application starts (ApplicationReadyEvent).
 *   2. Every night at 01:00 to keep the rolling 30-day window filled.
 *
 * Idempotent — skips any (doctorId, startTime) pair that already exists in the DB.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlotGenerationService {

    /** How many days ahead to generate slots for. */
    private static final int LOOKAHEAD_DAYS = 30;

    private final AppointmentSlotRepository slotRepository;
    private final DoctorServiceClient       doctorClient;

    // ── Triggers ─────────────────────────────────────────────────────────────

    @EventListener(ApplicationReadyEvent.class)
    public void generateOnStartup() {
        log.info("SlotGenerationService: generating slots on startup …");
        int count = generateSlotsForNextDays(LOOKAHEAD_DAYS);
        log.info("SlotGenerationService: {} slot(s) created on startup", count);
    }

    /** Runs every night at 01:00 to extend the rolling window. */
    @Scheduled(cron = "0 0 1 * * *")
    public void generateScheduled() {
        log.info("SlotGenerationService: nightly run …");
        int count = generateSlotsForNextDays(LOOKAHEAD_DAYS);
        log.info("SlotGenerationService: {} slot(s) created in nightly run", count);
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    /**
     * Creates slots for every approved doctor's availability templates for the
     * next {@code days} calendar days.  Returns the number of new slots created.
     */
    public int generateSlotsForNextDays(int days) {
        List<DoctorServiceClient.DoctorInfo> doctors = doctorClient.getApprovedDoctors();
        if (doctors.isEmpty()) {
            log.info("SlotGenerationService: no approved doctors found — skipping generation");
            return 0;
        }

        int total = 0;
        for (DoctorServiceClient.DoctorInfo doctor : doctors) {
            total += generateForDoctor(doctor, days);
        }
        return total;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int generateForDoctor(DoctorServiceClient.DoctorInfo doctor, int days) {
        List<DoctorServiceClient.AvailabilityDto> templates =
                doctorClient.getDoctorAvailability(doctor.id());

        if (templates.isEmpty()) return 0;

        int created = 0;
        LocalDate today = LocalDate.now();

        for (DoctorServiceClient.AvailabilityDto template : templates) {
            DayOfWeek templateDay;
            LocalTime  slotStart;
            LocalTime  slotEnd;

            try {
                templateDay = DayOfWeek.valueOf(template.dayOfWeek().toUpperCase());
                slotStart   = parseTime(template.startTime());
                slotEnd     = parseTime(template.endTime());
            } catch (Exception e) {
                log.warn("SlotGenerationService: could not parse template {} for doctor {} — {}",
                        template.id(), doctor.id(), e.getMessage());
                continue;
            }

            for (int i = 0; i < days; i++) {
                LocalDate date = today.plusDays(i);
                if (date.getDayOfWeek() != templateDay) continue;

                LocalDateTime startDt = date.atTime(slotStart);
                LocalDateTime endDt   = date.atTime(slotEnd);

                // Skip if the slot already exists (idempotency)
                if (slotRepository.existsByDoctorIdAndStartTime(doctor.id(), startDt)) continue;

                AppointmentSlot slot = new AppointmentSlot();
                slot.setDoctorId(doctor.id());
                slot.setDoctorName(doctor.name());
                slot.setStartTime(startDt);
                slot.setEndTime(endDt);
                slot.setFee(doctor.consultationFee() != null
                        ? BigDecimal.valueOf(doctor.consultationFee())
                        : BigDecimal.ZERO);
                slot.setStatus(SlotStatus.AVAILABLE);

                slotRepository.save(slot);
                created++;
            }
        }
        return created;
    }

    /**
     * Parses a LocalTime from either "HH:mm:ss" or "HH:mm" string representations.
     * Spring Boot / Jackson typically serialises LocalTime as "HH:mm:ss" when
     * WRITE_DATES_AS_TIMESTAMPS is false (the Spring Boot default).
     */
    private static LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) throw new IllegalArgumentException("blank time value");
        // Handle both "09:00" and "09:00:00"
        return raw.length() == 5 ? LocalTime.parse(raw + ":00") : LocalTime.parse(raw);
    }
}
