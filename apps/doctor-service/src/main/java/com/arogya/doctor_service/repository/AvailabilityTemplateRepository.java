package com.arogya.doctor_service.repository;

import com.arogya.doctor_service.model.AvailabilityTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AvailabilityTemplateRepository extends JpaRepository<AvailabilityTemplate, Long> {
    List<AvailabilityTemplate> findByDoctorId(Long doctorId);
}
