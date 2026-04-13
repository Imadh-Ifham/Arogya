package com.arogya.doctor_service.controller;

import com.arogya.doctor_service.model.*;
import com.arogya.doctor_service.service.DoctorService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @PostMapping("/register")
    public Doctor register(@RequestBody Doctor doctor) {
        return doctorService.registerDoctor(doctor);
    }

    @GetMapping("/{id}")
    public Doctor getProfile(@PathVariable Long id) {
        return doctorService.getDoctorProfile(id);
    }

    @PostMapping("/{id}/reviews")
    public Review addReview(@PathVariable Long id, @RequestBody Review review) {
        return doctorService.addReview(id, review);
    }

    @PostMapping("/{id}/availability")
    public AvailabilityTemplate addAvailability(@PathVariable Long id, @RequestBody AvailabilityTemplate template) {
        return doctorService.addAvailability(id, template);
    }
}
