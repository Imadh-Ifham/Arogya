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
            ResponseEntity<List<DoctorDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<DoctorDto>>() {}
            );
            List<DoctorDto> doctors = response.getBody();
            if (doctors == null) return Collections.emptyList();
            return doctors.stream().map(DoctorDto::id).toList();
        } catch (RestClientException e) {
            log.warn("Doctor-service unreachable when filtering by specialty '{}': {}", specialty, e.getMessage());
            return Collections.emptyList();
        }
    }

    // Minimal projection — we only need the ID from the doctor-service response
    private record DoctorDto(String id) {}
}
