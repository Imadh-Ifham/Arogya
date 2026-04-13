package com.arogya.doctor_service.repository;

import com.arogya.doctor_service.model.Doctor;
import com.arogya.doctor_service.model.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    // Custom method to let patients search only for approved doctors!
    List<Doctor> findByVerificationStatus(VerificationStatus status);
}

