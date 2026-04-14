package com.arogya.doctor_service.controller;

import com.arogya.doctor_service.dto.DoctorSummaryDto;
import com.arogya.doctor_service.model.VerificationStatus;
import com.arogya.doctor_service.service.DoctorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/doctors")
public class AdminDoctorController {

    private final DoctorService doctorService;

    public AdminDoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    /** GET /api/admin/doctors?status=PENDING — list all doctors, optionally filtered by status */
    @GetMapping
    public List<DoctorSummaryDto> listDoctors(@RequestParam(required = false) String status) {
        var doctors = (status != null && !status.isBlank())
                ? doctorService.getDoctorsByStatus(VerificationStatus.valueOf(status.toUpperCase()))
                : doctorService.getAllDoctors();
        return doctors.stream().map(DoctorSummaryDto::from).toList();
    }

    @PutMapping("/{id}/verify")
    public DoctorSummaryDto approveDoctor(@PathVariable Long id) {
        return DoctorSummaryDto.from(doctorService.updateVerificationStatus(id, VerificationStatus.APPROVED));
    }

    @PutMapping("/{id}/reject")
    public DoctorSummaryDto rejectDoctor(@PathVariable Long id) {
        return DoctorSummaryDto.from(doctorService.updateVerificationStatus(id, VerificationStatus.REJECTED));
    }
}
