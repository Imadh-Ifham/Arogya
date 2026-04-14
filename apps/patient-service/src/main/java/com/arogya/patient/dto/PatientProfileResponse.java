package com.arogya.patient.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class PatientProfileResponse {

    private UUID patientId;
    private String authUserId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private LocalDateTime patientCreatedAt;
    private UUID profileId;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodGroup;
    private Integer heightCm;
    private Integer weightKg;
    private String address;
    private String city;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private List<String> allergies;
    private String medicalConditions;
    private String currentMedications;
    private LocalDateTime profileCreatedAt;
    private LocalDateTime profileUpdatedAt;
    private List<PatientDocumentResponse> documents;

    public UUID getPatientId() {
        return patientId;
    }

    public void setPatientId(UUID patientId) {
        this.patientId = patientId;
    }

    public String getAuthUserId() {
        return authUserId;
    }

    public void setAuthUserId(String authUserId) {
        this.authUserId = authUserId;
    }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public LocalDateTime getPatientCreatedAt() {
        return patientCreatedAt;
    }

    public void setPatientCreatedAt(LocalDateTime patientCreatedAt) {
        this.patientCreatedAt = patientCreatedAt;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public void setProfileId(UUID profileId) {
        this.profileId = profileId;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBloodGroup() {
        return bloodGroup;
    }

    public void setBloodGroup(String bloodGroup) {
        this.bloodGroup = bloodGroup;
    }

    public Integer getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(Integer heightCm) {
        this.heightCm = heightCm;
    }

    public Integer getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Integer weightKg) {
        this.weightKg = weightKg;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getEmergencyContactName() {
        return emergencyContactName;
    }

    public void setEmergencyContactName(String emergencyContactName) {
        this.emergencyContactName = emergencyContactName;
    }

    public String getEmergencyContactPhone() {
        return emergencyContactPhone;
    }

    public void setEmergencyContactPhone(String emergencyContactPhone) {
        this.emergencyContactPhone = emergencyContactPhone;
    }

    public String getEmergencyContactRelationship() {
        return emergencyContactRelationship;
    }

    public void setEmergencyContactRelationship(String emergencyContactRelationship) {
        this.emergencyContactRelationship = emergencyContactRelationship;
    }

    public List<String> getAllergies() {
        return allergies;
    }

    public void setAllergies(List<String> allergies) {
        this.allergies = allergies;
    }

    public String getMedicalConditions() {
        return medicalConditions;
    }

    public void setMedicalConditions(String medicalConditions) {
        this.medicalConditions = medicalConditions;
    }

    public String getCurrentMedications() {
        return currentMedications;
    }

    public void setCurrentMedications(String currentMedications) {
        this.currentMedications = currentMedications;
    }

    public LocalDateTime getProfileCreatedAt() {
        return profileCreatedAt;
    }

    public void setProfileCreatedAt(LocalDateTime profileCreatedAt) {
        this.profileCreatedAt = profileCreatedAt;
    }

    public LocalDateTime getProfileUpdatedAt() {
        return profileUpdatedAt;
    }

    public void setProfileUpdatedAt(LocalDateTime profileUpdatedAt) {
        this.profileUpdatedAt = profileUpdatedAt;
    }

    public List<PatientDocumentResponse> getDocuments() {
        return documents;
    }

    public void setDocuments(List<PatientDocumentResponse> documents) {
        this.documents = documents;
    }
}
