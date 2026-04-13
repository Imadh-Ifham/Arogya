package com.arogya.patient.repository;

import com.arogya.patient.domain.PatientDocument;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PatientDocumentRepository extends JpaRepository<PatientDocument, UUID> {

    List<PatientDocument> findByPatientIdOrderByUploadedAtDesc(UUID patientId);

    @Query("""
            SELECT d FROM PatientDocument d
            WHERE d.patient.id = :patientId
              AND (:type IS NULL OR d.documentType = :type)
              AND (:from IS NULL OR d.uploadedAt >= :from)
              AND (:to IS NULL OR d.uploadedAt <= :to)
            ORDER BY d.uploadedAt DESC
            """)
    List<PatientDocument> findByPatientIdWithFilters(
            @Param("patientId") UUID patientId,
            @Param("type") String type,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
