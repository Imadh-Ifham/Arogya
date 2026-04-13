package com.arogya.doctor_service.service;

import com.arogya.doctor_service.model.*;
import com.arogya.doctor_service.repository.*;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final ReviewRepository reviewRepository;
    private final AvailabilityTemplateRepository availabilityRepository;

    // Spring automatically injects all three repositories here
    public DoctorService(DoctorRepository docRepo, ReviewRepository revRepo, AvailabilityTemplateRepository availRepo) {
        this.doctorRepository = docRepo;
        this.reviewRepository = revRepo;
        this.availabilityRepository = availRepo;
    }

    // 1. Doctor Registration (Defaults to PENDING)
    public Doctor registerDoctor(Doctor doctor) {
        doctor.setVerificationStatus(VerificationStatus.PENDING);
        return doctorRepository.save(doctor);
    }

    // 1b. Search / list doctors — optional specialty filter, only APPROVED doctors visible to patients
    public List<Doctor> getDoctors(String specialty) {
        if (specialty != null && !specialty.isBlank()) {
            return doctorRepository.findBySpecialtyContainingIgnoreCaseAndVerificationStatus(
                    specialty, VerificationStatus.APPROVED);
        }
        return doctorRepository.findByVerificationStatus(VerificationStatus.APPROVED);
    }

    // 2. Get Doctor with Calculated Average Rating
    public Doctor getDoctorProfile(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        // Calculate average rating dynamically
        List<Review> reviews = reviewRepository.findByDoctorId(id);
        if (!reviews.isEmpty()) {
            double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
            doctor.setAverageRating(Math.round(avg * 10.0) / 10.0); // Round to 1 decimal
        }
        return doctor;
    }

    // 3. Admin: Update Status
    public Doctor updateVerificationStatus(Long id, VerificationStatus status) {
        Doctor doctor = getDoctorProfile(id);
        doctor.setVerificationStatus(status);
        return doctorRepository.save(doctor);
    }

    // 4. Add Review
    public Review addReview(Long doctorId, Review review) {
        Doctor doctor = getDoctorProfile(doctorId);
        review.setDoctor(doctor);
        return reviewRepository.save(review);
    }

    // 5. Add Availability Template
    public AvailabilityTemplate addAvailability(Long doctorId, AvailabilityTemplate template) {
        Doctor doctor = getDoctorProfile(doctorId);
        template.setDoctor(doctor);
        return availabilityRepository.save(template);
    }

    // 6. Get doctor by auth user ID (for /me endpoint)
    public Optional<Doctor> getDoctorByAuthUserId(String authUserId) {
        return doctorRepository.findByAuthUserId(authUserId);
    }

    // 7. Update doctor profile fields (partial update — null fields are skipped)
    public Doctor updateDoctorProfile(Long doctorId, Doctor updates) {
        Doctor doctor = getDoctorProfile(doctorId);
        if (updates.getSpecialty() != null)       doctor.setSpecialty(updates.getSpecialty());
        if (updates.getBio() != null)              doctor.setBio(updates.getBio());
        if (updates.getConsultationFee() != null)  doctor.setConsultationFee(updates.getConsultationFee());
        if (updates.getQualifications() != null)   doctor.setQualifications(updates.getQualifications());
        if (updates.getLanguages() != null)        doctor.setLanguages(updates.getLanguages());
        if (updates.getName() != null)             doctor.setName(updates.getName());
        return doctorRepository.save(doctor);
    }

    // 8. Get availability templates for a doctor
    public List<AvailabilityTemplate> getAvailability(Long doctorId) {
        getDoctorProfile(doctorId); // ensure doctor exists
        return availabilityRepository.findByDoctorId(doctorId);
    }

    // 9. Delete a specific availability template
    public void deleteAvailability(Long doctorId, Long templateId) {
        getDoctorProfile(doctorId); // ensure doctor exists
        availabilityRepository.deleteById(templateId);
    }
}
