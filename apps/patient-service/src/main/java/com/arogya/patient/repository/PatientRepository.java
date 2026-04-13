package com.arogya.patient.repository;

import com.arogya.patient.domain.Patient;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByAuthUserId(String authUserId);

    boolean existsByAuthUserId(String authUserId);
}
