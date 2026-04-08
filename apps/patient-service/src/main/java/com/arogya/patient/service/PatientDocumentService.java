package com.arogya.patient.service;

import com.arogya.patient.config.StorageProperties;
import com.arogya.patient.domain.Patient;
import com.arogya.patient.domain.PatientDocument;
import com.arogya.patient.dto.PatientDocumentResponse;
import com.arogya.patient.exception.DocumentStorageException;
import com.arogya.patient.repository.PatientDocumentRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PatientDocumentService {

    private final PatientService patientService;
    private final PatientDocumentRepository patientDocumentRepository;
    private final Path uploadRoot;

    public PatientDocumentService(
            PatientService patientService,
            PatientDocumentRepository patientDocumentRepository,
            StorageProperties storageProperties) {
        this.patientService = patientService;
        this.patientDocumentRepository = patientDocumentRepository;
        this.uploadRoot = Path.of(storageProperties.getUploadDir()).toAbsolutePath().normalize();
    }

    @Transactional
    public PatientDocumentResponse uploadDocument(UUID authUserId, MultipartFile file, String description) {
        Patient patient = patientService.getPatientByAuthUserId(authUserId);
        String relativeFileUrl = storeFile(patient.getId(), file);

        PatientDocument document = new PatientDocument();
        document.setPatient(patient);
        document.setFileUrl(relativeFileUrl);
        document.setDescription(description);

        PatientDocument savedDocument = patientDocumentRepository.save(document);
        return toDocumentResponse(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<PatientDocumentResponse> getPatientDocuments(UUID authUserId) {
        Patient patient = patientService.getPatientByAuthUserId(authUserId);
        return patientDocumentRepository.findByPatientIdOrderByUploadedAtDesc(patient.getId())
                .stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    protected String storeFile(UUID patientId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new DocumentStorageException("Document file is required");
        }

        String sanitizedFilename = sanitizeFilename(file.getOriginalFilename());
        Path patientDirectory = uploadRoot.resolve(patientId.toString()).normalize();
        Path targetFile = patientDirectory.resolve(sanitizedFilename).normalize();

        if (!targetFile.startsWith(patientDirectory)) {
            throw new DocumentStorageException("Invalid document path");
        }

        try {
            Files.createDirectories(patientDirectory);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new DocumentStorageException("Failed to store patient document", ex);
        }

        return "/uploads/" + patientId + "/" + sanitizedFilename;
    }

    private PatientDocumentResponse toDocumentResponse(PatientDocument document) {
        PatientDocumentResponse response = new PatientDocumentResponse();
        response.setId(document.getId());
        response.setFileUrl(document.getFileUrl());
        response.setDescription(document.getDescription());
        response.setUploadedAt(document.getUploadedAt());
        return response;
    }

    private String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return UUID.randomUUID() + ".bin";
        }

        String sanitized = Path.of(originalFilename).getFileName().toString()
                .replaceAll("[^a-zA-Z0-9._-]", "_");

        if (sanitized.isBlank()) {
            return UUID.randomUUID() + ".bin";
        }

        return sanitized;
    }
}
