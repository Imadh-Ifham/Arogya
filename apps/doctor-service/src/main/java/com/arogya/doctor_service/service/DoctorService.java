package com.arogya.doctor_service.service;

import com.arogya.doctor_service.model.*;
import com.arogya.doctor_service.repository.*;
import org.springframework.stereotype.Service;
import java.util.List;

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
}
