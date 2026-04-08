package com.arogya.patient.repository;

import com.arogya.patient.domain.PatientDocument;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientDocumentRepository extends JpaRepository<PatientDocument, UUID> {

    List<PatientDocument> findByPatientIdOrderByUploadedAtDesc(UUID patientId);
}
