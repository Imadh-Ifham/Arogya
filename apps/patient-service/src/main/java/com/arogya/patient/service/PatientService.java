package com.arogya.patient.service;

import com.arogya.patient.domain.Patient;
import com.arogya.patient.domain.PatientProfile;
import com.arogya.patient.dto.CreatePatientProfileRequest;
import com.arogya.patient.dto.PatientDocumentResponse;
import com.arogya.patient.dto.PatientProfileResponse;
import com.arogya.patient.dto.UpdatePatientProfileRequest;
import com.arogya.patient.exception.PatientNotFoundException;
import com.arogya.patient.exception.PatientProfileNotFoundException;
import com.arogya.patient.repository.PatientDocumentRepository;
import com.arogya.patient.repository.PatientProfileRepository;
import com.arogya.patient.repository.PatientRepository;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
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

    /**
     * Upsert: auto-creates the Patient entity if it doesn't exist yet,
     * then creates or updates the PatientProfile.
     */
    @Transactional
    public PatientProfileResponse createPatientProfile(CreatePatientProfileRequest request) {
        Patient patient = patientRepository.findByAuthUserId(request.getAuthUserId())
                .orElseGet(() -> {
                    Patient p = new Patient();
                    p.setAuthUserId(request.getAuthUserId());
                    return patientRepository.save(p);
                });

        PatientProfile profile = patientProfileRepository.findByPatientId(patient.getId())
                .orElseGet(() -> {
                    PatientProfile p = new PatientProfile();
                    p.setPatient(patient);
                    return p;
                });

        applyProfileDetails(profile, request);
        patientProfileRepository.save(profile);

        patient.setProfile(profile);
        return toProfileResponse(patient, profile);
    }

    /**
     * Returns the patient's profile. Auto-creates the Patient entity on first
     * access (lazy init). Returns an empty-profile response if the patient has
     * not yet filled in their profile details.
     */
    @Transactional
    public PatientProfileResponse getPatientProfileByAuthUserId(String authUserId) {
        Patient patient = patientRepository.findByAuthUserId(authUserId)
                .orElseGet(() -> {
                    Patient p = new Patient();
                    p.setAuthUserId(authUserId);
                    return patientRepository.save(p);
                });

        return patientProfileRepository.findByPatientId(patient.getId())
                .map(profile -> toProfileResponse(patient, profile))
                .orElse(toEmptyProfileResponse(patient));
    }

    @Transactional
    public PatientProfileResponse updatePatientProfile(String authUserId, UpdatePatientProfileRequest request) {
        Patient patient = getPatientByAuthUserId(authUserId);
        PatientProfile profile = patientProfileRepository.findByPatientId(patient.getId())
                .orElseGet(() -> {
                    PatientProfile p = new PatientProfile();
                    p.setPatient(patient);
                    return p;
                });

        applyProfileDetails(profile, request);
        patientProfileRepository.save(profile);

        return toProfileResponse(patient, profile);
    }

    @Transactional(readOnly = true)
    public Patient getPatientByAuthUserId(String authUserId) {
        return patientRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new PatientNotFoundException(
                        "Patient not found for auth user id: " + authUserId));
    }

    @Transactional(readOnly = true)
    public boolean patientExists(String authUserId) {
        return patientRepository.existsByAuthUserId(authUserId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void applyProfileDetails(PatientProfile profile, CreatePatientProfileRequest req) {
        if (req.getFirstName() != null)  profile.setFirstName(req.getFirstName());
        if (req.getLastName() != null)   profile.setLastName(req.getLastName());
        if (req.getPhoneNumber() != null) profile.setPhoneNumber(req.getPhoneNumber());
        if (req.getDateOfBirth() != null) profile.setDateOfBirth(req.getDateOfBirth());
        if (req.getGender() != null)     profile.setGender(req.getGender());
        if (req.getBloodGroup() != null) profile.setBloodGroup(req.getBloodGroup());
        if (req.getHeightCm() != null)   profile.setHeightCm(req.getHeightCm());
        if (req.getWeightKg() != null)   profile.setWeightKg(req.getWeightKg());
        if (req.getAddress() != null)    profile.setStreetAddress(req.getAddress());
        if (req.getCity() != null)       profile.setCity(req.getCity());
        if (req.getEmergencyContactName() != null)
            profile.setEmergencyContactName(req.getEmergencyContactName());
        if (req.getEmergencyContactPhone() != null)
            profile.setEmergencyContactPhone(req.getEmergencyContactPhone());
        if (req.getEmergencyContactRelationship() != null)
            profile.setEmergencyContactRelationship(req.getEmergencyContactRelationship());
        if (req.getAllergies() != null)
            profile.setKnownAllergies(String.join(", ", req.getAllergies()));
        if (req.getMedicalConditions() != null)
            profile.setMedicalConditions(req.getMedicalConditions());
        if (req.getCurrentMedications() != null)
            profile.setCurrentMedications(req.getCurrentMedications());
    }

    private void applyProfileDetails(PatientProfile profile, UpdatePatientProfileRequest req) {
        if (req.getFirstName() != null)  profile.setFirstName(req.getFirstName());
        if (req.getLastName() != null)   profile.setLastName(req.getLastName());
        if (req.getPhoneNumber() != null) profile.setPhoneNumber(req.getPhoneNumber());
        if (req.getDateOfBirth() != null) profile.setDateOfBirth(req.getDateOfBirth());
        if (req.getGender() != null)     profile.setGender(req.getGender());
        if (req.getBloodGroup() != null) profile.setBloodGroup(req.getBloodGroup());
        if (req.getHeightCm() != null)   profile.setHeightCm(req.getHeightCm());
        if (req.getWeightKg() != null)   profile.setWeightKg(req.getWeightKg());
        if (req.getAddress() != null)    profile.setStreetAddress(req.getAddress());
        if (req.getCity() != null)       profile.setCity(req.getCity());
        if (req.getEmergencyContactName() != null)
            profile.setEmergencyContactName(req.getEmergencyContactName());
        if (req.getEmergencyContactPhone() != null)
            profile.setEmergencyContactPhone(req.getEmergencyContactPhone());
        if (req.getEmergencyContactRelationship() != null)
            profile.setEmergencyContactRelationship(req.getEmergencyContactRelationship());
        if (req.getAllergies() != null)
            profile.setKnownAllergies(String.join(", ", req.getAllergies()));
        if (req.getMedicalConditions() != null)
            profile.setMedicalConditions(req.getMedicalConditions());
        if (req.getCurrentMedications() != null)
            profile.setCurrentMedications(req.getCurrentMedications());
    }

    private PatientProfileResponse toProfileResponse(Patient patient, PatientProfile profile) {
        PatientProfileResponse response = new PatientProfileResponse();
        response.setPatientId(patient.getId());
        response.setAuthUserId(patient.getAuthUserId());
        response.setPatientCreatedAt(patient.getCreatedAt());
        response.setProfileId(profile.getId());
        response.setFirstName(profile.getFirstName());
        response.setLastName(profile.getLastName());
        response.setPhoneNumber(profile.getPhoneNumber());
        response.setDateOfBirth(profile.getDateOfBirth());
        response.setGender(profile.getGender());
        response.setBloodGroup(profile.getBloodGroup());
        response.setHeightCm(profile.getHeightCm());
        response.setWeightKg(profile.getWeightKg());
        response.setAddress(profile.getStreetAddress());
        response.setCity(profile.getCity());
        response.setEmergencyContactName(profile.getEmergencyContactName());
        response.setEmergencyContactPhone(profile.getEmergencyContactPhone());
        response.setEmergencyContactRelationship(profile.getEmergencyContactRelationship());
        response.setAllergies(parseAllergies(profile.getKnownAllergies()));
        response.setMedicalConditions(profile.getMedicalConditions());
        response.setCurrentMedications(profile.getCurrentMedications());
        response.setProfileCreatedAt(profile.getCreatedAt());
        response.setProfileUpdatedAt(profile.getUpdatedAt());

        List<PatientDocumentResponse> documents = patientDocumentRepository
                .findByPatientIdOrderByUploadedAtDesc(patient.getId())
                .stream()
                .map(doc -> {
                    PatientDocumentResponse dr = new PatientDocumentResponse();
                    dr.setId(doc.getId());
                    dr.setFileUrl(doc.getFileUrl());
                    dr.setDescription(doc.getDescription());
                    dr.setUploadedAt(doc.getUploadedAt());
                    return dr;
                })
                .toList();
        response.setDocuments(documents);
        return response;
    }

    /** Returns a response with null profile fields when no profile has been created yet. */
    private PatientProfileResponse toEmptyProfileResponse(Patient patient) {
        PatientProfileResponse response = new PatientProfileResponse();
        response.setPatientId(patient.getId());
        response.setAuthUserId(patient.getAuthUserId());
        response.setPatientCreatedAt(patient.getCreatedAt());
        response.setAllergies(Collections.emptyList());
        response.setDocuments(Collections.emptyList());
        return response;
    }

    /** Converts a comma-joined allergies string back to a list. */
    private List<String> parseAllergies(String knownAllergies) {
        if (knownAllergies == null || knownAllergies.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(knownAllergies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
