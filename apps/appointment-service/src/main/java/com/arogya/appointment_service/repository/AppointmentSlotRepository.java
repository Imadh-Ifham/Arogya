package com.arogya.appointment_service.repository;

import com.arogya.appointment_service.entity.AppointmentSlot;
import com.arogya.appointment_service.enums.SlotStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentSlotRepository extends JpaRepository<AppointmentSlot, String> {

    // Used by APT-01: search available slots for a specific doctor on a date range
    List<AppointmentSlot> findByDoctorIdAndStatusAndStartTimeBetween(
            String doctorId, SlotStatus status,
            LocalDateTime from, LocalDateTime to);

    // Used by APT-01: search available slots across multiple doctors (specialty filter)
    List<AppointmentSlot> findByDoctorIdInAndStatusAndStartTimeBetween(
            List<String> doctorIds, SlotStatus status,
            LocalDateTime from, LocalDateTime to);

    // Used by APT-01: browse all available slots (no doctor/date filter)
    List<AppointmentSlot> findByStatus(SlotStatus status);
}
