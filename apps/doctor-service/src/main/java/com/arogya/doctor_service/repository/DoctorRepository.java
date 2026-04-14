package com.arogya.doctor_service.repository;

import com.arogya.doctor_service.model.Doctor;
import com.arogya.doctor_service.model.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    // Custom method to let patients search only for approved doctors!
    List<Doctor> findByVerificationStatus(VerificationStatus status);

    // Search by specialty (case-insensitive) and verification status
    List<Doctor> findBySpecialtyContainingIgnoreCaseAndVerificationStatus(String specialty, VerificationStatus status);

    // Look up a doctor by their auth-service user ID (MongoDB ObjectId string)
    Optional<Doctor> findByAuthUserId(String authUserId);
}

