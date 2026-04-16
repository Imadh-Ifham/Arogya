package com.arogya.appointment_service.repository;

import com.arogya.appointment_service.entity.Appointment;
import com.arogya.appointment_service.enums.AppointmentStatus;
import com.arogya.appointment_service.enums.AppointmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    List<Appointment> findByPatientId(String patientId);

    List<Appointment> findByDoctorId(String doctorId);

    Optional<Appointment> findByIdAndPatientId(String id, String patientId);

    /**
     * Find PHYSICAL appointments whose slot has already started (appointment date passed)
     * but are still in an unresolved state (PAYMENT_COMPLETED only — awaiting doctor action).
     * These should be transitioned to EXPIRED.
     */
    @Query("""
        SELECT a FROM Appointment a
        JOIN AppointmentSlot s ON s.id = a.slotId
        WHERE a.appointmentType = :type
          AND a.status = :status
          AND s.startTime < :now
        """)
    List<Appointment> findPhysicalAppointmentsPastSlotWithStatus(
        @Param("type") AppointmentType type,
        @Param("status") AppointmentStatus status,
        @Param("now") java.time.LocalDateTime now);
}
