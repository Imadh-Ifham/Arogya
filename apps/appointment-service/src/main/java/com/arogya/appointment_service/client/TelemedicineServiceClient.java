package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Calls telemedicine-service to create a video session when a patient books
 * an ONLINE appointment.
 *
 * Expected telemedicine-service endpoint:
 *   POST /api/sessions
 *   Body: { "appointmentId": "...", "patientId": "...", "doctorId": "..." }
 *   Response: { "meetingUrl": "https://..." }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelemedicineServiceClient {

    private final RestTemplate restTemplate;
    private final String telemedicineServiceUrl;

    /**
     * Creates a telemedicine session and returns the meeting URL.
     * Throws RuntimeException if the telemedicine-service is unreachable,
     * so the booking transaction rolls back and the patient is notified.
     */
    public String createSession(String appointmentId, String patientId, String doctorId) {
        String url = telemedicineServiceUrl + "/api/sessions";

        Map<String, String> body = Map.of(
                "appointmentId", appointmentId,
                "patientId", patientId,
                "doctorId", doctorId
        );

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);
            if (response.getBody() == null || !response.getBody().containsKey("meetingUrl")) {
                throw new RuntimeException("Telemedicine service returned an invalid response");
            }
            return (String) response.getBody().get("meetingUrl");
        } catch (RestClientException e) {
            log.error("Failed to create telemedicine session for appointment {}: {}", appointmentId, e.getMessage());
            throw new RuntimeException("Could not create telemedicine session. Please try again or choose a physical appointment.", e);
        }
    }
}
