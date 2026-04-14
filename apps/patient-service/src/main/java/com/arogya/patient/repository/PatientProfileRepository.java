package com.arogya.patient.repository;

import com.arogya.patient.domain.PatientProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, UUID> {

    Optional<PatientProfile> findByPatientId(UUID patientId);
}
