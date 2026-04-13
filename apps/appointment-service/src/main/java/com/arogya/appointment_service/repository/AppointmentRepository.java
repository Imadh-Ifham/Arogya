package com.arogya.appointment_service.repository;

import com.arogya.appointment_service.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    List<Appointment> findByPatientId(String patientId);

    List<Appointment> findByDoctorId(String doctorId);

    Optional<Appointment> findByIdAndPatientId(String id, String patientId);
}
