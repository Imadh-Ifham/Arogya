package com.arogya.patient.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.arogya.patient.config.StorageProperties;
import com.arogya.patient.domain.Patient;
import com.arogya.patient.domain.PatientDocument;
import com.arogya.patient.dto.PatientDocumentResponse;
import com.arogya.patient.exception.DocumentStorageException;
import com.arogya.patient.repository.PatientDocumentRepository;

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
    public PatientDocumentResponse uploadDocument(
            String authUserId, MultipartFile file, String description, String documentType) {
        Patient patient = patientService.getPatientByAuthUserId(authUserId);
        String effectiveType = (documentType != null && !documentType.isBlank()) ? documentType : "general";
        String relativeFileUrl = storeFile(patient.getId(), file, effectiveType);

        PatientDocument document = new PatientDocument();
        document.setPatient(patient);
        document.setFileUrl(relativeFileUrl);
        document.setDocumentType(effectiveType);
        document.setDescription(description);

        PatientDocument savedDocument = patientDocumentRepository.save(document);
        return toDocumentResponse(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<PatientDocumentResponse> getPatientDocuments(
            String authUserId, String type, String fromStr, String toStr) {
        Patient patient = patientService.getPatientByAuthUserId(authUserId);
        LocalDateTime from = parseDateTime(fromStr, "from");
        LocalDateTime to = parseDateTime(toStr, "to");
        String normalizedType = (type != null && type.isBlank()) ? null : type;

        return patientDocumentRepository
                .findByPatientIdWithFilters(patient.getId(), normalizedType, from, to)
                .stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    protected String storeFile(UUID patientId, MultipartFile file, String documentType) {
        if (file == null || file.isEmpty()) {
            throw new DocumentStorageException("Document file is required");
        }

        String sanitizedFilename = sanitizeFilename(file.getOriginalFilename());
        // Path: uploads/{patientId}/{documentType}/{filename}
        Path typeDirectory = uploadRoot.resolve(patientId.toString())
                .resolve(documentType).normalize();
        Path targetFile = typeDirectory.resolve(sanitizedFilename).normalize();

        if (!targetFile.startsWith(typeDirectory)) {
            throw new DocumentStorageException("Invalid document path");
        }

        try {
            Files.createDirectories(typeDirectory);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new DocumentStorageException("Failed to store patient document", ex);
        }

        return "/uploads/" + patientId + "/" + documentType + "/" + sanitizedFilename;
    }

    private PatientDocumentResponse toDocumentResponse(PatientDocument document) {
        PatientDocumentResponse response = new PatientDocumentResponse();
        response.setId(document.getId());
        response.setFileUrl(document.getFileUrl());
        response.setDocumentType(document.getDocumentType());
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

    private LocalDateTime parseDateTime(String value, String paramName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            // Accept ISO date (2024-01-01) or ISO datetime (2024-01-01T00:00:00)
            if (value.length() == 10) {
                return LocalDateTime.parse(value + "T00:00:00");
            }
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException e) {
            throw new DocumentStorageException(
                    "Invalid date format for '" + paramName + "'. Expected ISO format: yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss");
        }
    }
}
