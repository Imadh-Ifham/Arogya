package com.arogya.doctor_service.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Data
@Table(name = "doctors")
public class Doctor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long Id;

    // Auth Integration: This is the ID from Dahami's Auth Service
    private String authUserId;

    // Basic Profile
    private String name;
    private String bio;
    private Double consultationFee;

    @ElementCollection
    private List<String> languages;

    // Credentials
    private String licenseNumber;
    private String qualifications;

    // Admin Approval Status
    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    // Ratings (Calculated field, not stored as a column)
    @Transient
    private Double averageRating = 0.0;

}
