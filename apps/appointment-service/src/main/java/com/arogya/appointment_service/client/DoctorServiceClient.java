package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

/**
 * Calls doctor-service to resolve doctor IDs by specialty.
 * Used by APT-01: Browse & search doctors by specialty/availability.
 *
 * Doctor-service is expected to expose:
 *   GET /api/doctors?specialty={specialty}  →  List<{ id: String, ... }>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DoctorServiceClient {

    private final RestTemplate restTemplate;
    private final String doctorServiceUrl;

    /**
     * Returns the list of doctor IDs that match the given specialty.
     * Returns an empty list (not an exception) if the doctor-service is unreachable,
     * so the slot search gracefully returns no results instead of 500.
     */
    public List<String> getDoctorIdsBySpecialty(String specialty) {
        String url = doctorServiceUrl + "/api/doctors?specialty=" + specialty;
        try {
            ResponseEntity<List<DoctorInfo>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<DoctorInfo>>() {}
            );
            List<DoctorInfo> doctors = response.getBody();
            if (doctors == null) return Collections.emptyList();
            return doctors.stream().map(DoctorInfo::id).toList();
        } catch (RestClientException e) {
            log.warn("Doctor-service unreachable when filtering by specialty '{}': {}", specialty, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Returns all APPROVED doctors from doctor-service for slot generation.
     * Returns an empty list if doctor-service is unreachable.
     */
    public List<DoctorInfo> getApprovedDoctors() {
        String url = doctorServiceUrl + "/api/doctors";
        try {
            ResponseEntity<List<DoctorInfo>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<DoctorInfo>>() {}
            );
            List<DoctorInfo> doctors = response.getBody();
            return doctors != null ? doctors : Collections.emptyList();
        } catch (RestClientException e) {
            log.warn("Doctor-service unreachable when fetching approved doctors: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Returns the weekly availability templates for a given doctor ID.
     * Returns an empty list if the doctor has no templates or the service is unreachable.
     */
    public List<AvailabilityDto> getDoctorAvailability(String doctorId) {
        String url = doctorServiceUrl + "/api/doctors/" + doctorId + "/availability";
        try {
            ResponseEntity<List<AvailabilityDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<AvailabilityDto>>() {}
            );
            List<AvailabilityDto> templates = response.getBody();
            return templates != null ? templates : Collections.emptyList();
        } catch (RestClientException e) {
            log.warn("Doctor-service unreachable when fetching availability for doctor {}: {}", doctorId, e.getMessage());
            return Collections.emptyList();
        }
    }

    /** Projection used for approved-doctor listing and specialty search. */
    public record DoctorInfo(String id, String name, Double consultationFee) {}

    /** Projection for a weekly availability template from doctor-service. */
    public record AvailabilityDto(Long id, String dayOfWeek, String startTime, String endTime) {}
}
