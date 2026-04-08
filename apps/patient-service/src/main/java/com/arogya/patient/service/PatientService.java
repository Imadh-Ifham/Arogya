package com.arogya.patient.service;

import com.arogya.patient.domain.Patient;
import com.arogya.patient.domain.PatientProfile;
import com.arogya.patient.dto.CreatePatientProfileRequest;
import com.arogya.patient.dto.PatientDocumentResponse;
import com.arogya.patient.dto.PatientProfileResponse;
import com.arogya.patient.dto.UpdatePatientProfileRequest;
import com.arogya.patient.exception.PatientAlreadyExistsException;
import com.arogya.patient.exception.PatientNotFoundException;
import com.arogya.patient.exception.PatientProfileNotFoundException;
import com.arogya.patient.repository.PatientDocumentRepository;
import com.arogya.patient.repository.PatientProfileRepository;
import com.arogya.patient.repository.PatientRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PatientDocumentRepository patientDocumentRepository;

    public PatientService(
            PatientRepository patientRepository,
            PatientProfileRepository patientProfileRepository,
            PatientDocumentRepository patientDocumentRepository) {
        this.patientRepository = patientRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.patientDocumentRepository = patientDocumentRepository;
    }

    @Transactional
    public PatientProfileResponse createPatientProfile(CreatePatientProfileRequest request) {
        if (patientRepository.existsByAuthUserId(request.getAuthUserId())) {
            throw new PatientAlreadyExistsException(
                    "Patient already exists for auth user id: " + request.getAuthUserId());
        }

        Patient patient = new Patient();
        patient.setAuthUserId(request.getAuthUserId());
        patientRepository.save(patient);

        PatientProfile profile = new PatientProfile();
        profile.setPatient(patient);
        applyProfileDetails(profile, request);
        patientProfileRepository.save(profile);

        patient.setProfile(profile);
        return toProfileResponse(patient, profile);
    }

    @Transactional(readOnly = true)
    public PatientProfileResponse getPatientProfileByAuthUserId(UUID authUserId) {
        Patient patient = getPatientByAuthUserId(authUserId);
        PatientProfile profile = getProfileByPatientId(patient.getId());
        return toProfileResponse(patient, profile);
    }

    @Transactional
    public PatientProfileResponse updatePatientProfile(UUID authUserId, UpdatePatientProfileRequest request) {
        Patient patient = getPatientByAuthUserId(authUserId);
        PatientProfile profile = getProfileByPatientId(patient.getId());

        applyProfileDetails(profile, request);
        patientProfileRepository.save(profile);

        return toProfileResponse(patient, profile);
    }

    @Transactional(readOnly = true)
    public Patient getPatientByAuthUserId(UUID authUserId) {
        return patientRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new PatientNotFoundException(
                        "Patient not found for auth user id: " + authUserId));
    }

    @Transactional(readOnly = true)
    public boolean patientExists(UUID authUserId) {
        return patientRepository.existsByAuthUserId(authUserId);
    }

    private PatientProfile getProfileByPatientId(UUID patientId) {
        return patientProfileRepository.findByPatientId(patientId)
                .orElseThrow(() -> new PatientProfileNotFoundException(
                        "Patient profile not found for patient id: " + patientId));
    }

    private void applyProfileDetails(PatientProfile profile, CreatePatientProfileRequest request) {
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(request.getGender());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setHeightCm(request.getHeightCm());
        profile.setWeightKg(request.getWeightKg());
        profile.setStreetAddress(request.getStreetAddress());
        profile.setCity(request.getCity());
        profile.setEmergencyContactName(request.getEmergencyContactName());
        profile.setEmergencyContactPhone(request.getEmergencyContactPhone());
        profile.setEmergencyContactRelationship(request.getEmergencyContactRelationship());
        profile.setKnownAllergies(request.getKnownAllergies());
        profile.setMedicalConditions(request.getMedicalConditions());
        profile.setCurrentMedications(request.getCurrentMedications());
    }

    private void applyProfileDetails(PatientProfile profile, UpdatePatientProfileRequest request) {
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(request.getGender());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setHeightCm(request.getHeightCm());
        profile.setWeightKg(request.getWeightKg());
        profile.setStreetAddress(request.getStreetAddress());
        profile.setCity(request.getCity());
        profile.setEmergencyContactName(request.getEmergencyContactName());
        profile.setEmergencyContactPhone(request.getEmergencyContactPhone());
        profile.setEmergencyContactRelationship(request.getEmergencyContactRelationship());
        profile.setKnownAllergies(request.getKnownAllergies());
        profile.setMedicalConditions(request.getMedicalConditions());
        profile.setCurrentMedications(request.getCurrentMedications());
    }

    private PatientProfileResponse toProfileResponse(Patient patient, PatientProfile profile) {
        PatientProfileResponse response = new PatientProfileResponse();
        response.setPatientId(patient.getId());
        response.setAuthUserId(patient.getAuthUserId());
        response.setPatientCreatedAt(patient.getCreatedAt());
        response.setProfileId(profile.getId());
        response.setDateOfBirth(profile.getDateOfBirth());
        response.setGender(profile.getGender());
        response.setBloodGroup(profile.getBloodGroup());
        response.setHeightCm(profile.getHeightCm());
        response.setWeightKg(profile.getWeightKg());
        response.setStreetAddress(profile.getStreetAddress());
        response.setCity(profile.getCity());
        response.setEmergencyContactName(profile.getEmergencyContactName());
        response.setEmergencyContactPhone(profile.getEmergencyContactPhone());
        response.setEmergencyContactRelationship(profile.getEmergencyContactRelationship());
        response.setKnownAllergies(profile.getKnownAllergies());
        response.setMedicalConditions(profile.getMedicalConditions());
        response.setCurrentMedications(profile.getCurrentMedications());
        response.setProfileCreatedAt(profile.getCreatedAt());
        response.setProfileUpdatedAt(profile.getUpdatedAt());

        List<PatientDocumentResponse> documents = patientDocumentRepository
                .findByPatientIdOrderByUploadedAtDesc(patient.getId())
                .stream()
                .map(document -> {
                    PatientDocumentResponse documentResponse = new PatientDocumentResponse();
                    documentResponse.setId(document.getId());
                    documentResponse.setFileUrl(document.getFileUrl());
                    documentResponse.setDescription(document.getDescription());
                    documentResponse.setUploadedAt(document.getUploadedAt());
                    return documentResponse;
                })
                .toList();
        response.setDocuments(documents);
        return response;
    }
}
