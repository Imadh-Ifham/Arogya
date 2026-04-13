package com.arogya.doctor_service.controller;

import com.arogya.doctor_service.model.Doctor;
import com.arogya.doctor_service.model.VerificationStatus;
import com.arogya.doctor_service.service.DoctorService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/doctors")
public class AdminDoctorController {

    private final DoctorService doctorService;

    public AdminDoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @PutMapping("/{id}/verify")
    public Doctor approveDoctor(@PathVariable Long id) {
        return doctorService.updateVerificationStatus(id, VerificationStatus.APPROVED);
    }

    @PutMapping("/{id}/reject")
    public Doctor rejectDoctor(@PathVariable Long id) {
        return doctorService.updateVerificationStatus(id, VerificationStatus.REJECTED);
    }
}
