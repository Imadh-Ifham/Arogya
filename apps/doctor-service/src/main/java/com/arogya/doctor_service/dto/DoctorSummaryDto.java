package com.arogya.doctor_service.dto;

import com.arogya.doctor_service.model.Doctor;

/**
 * Lightweight projection returned by GET /api/doctors.
 * The id is exposed as a String so downstream services (e.g. appointment-service)
 * can deserialize it into a String field without type-coercion issues.
 */
public record DoctorSummaryDto(
        String id,
        String authUserId,
        String name,
        String email,
        String specialty,
        String bio,
        Double consultationFee,
        String licenseNumber,
        String qualifications,
        String verificationStatus,
        Double averageRating
) {
    public static DoctorSummaryDto from(Doctor doctor) {
        return new DoctorSummaryDto(
                doctor.getId() != null ? doctor.getId().toString() : null,
                doctor.getAuthUserId(),
                doctor.getName(),
                doctor.getEmail(),
                doctor.getSpecialty(),
                doctor.getBio(),
                doctor.getConsultationFee(),
                doctor.getLicenseNumber(),
                doctor.getQualifications(),
                doctor.getVerificationStatus() != null ? doctor.getVerificationStatus().name() : null,
                doctor.getAverageRating()
        );
    }
}
