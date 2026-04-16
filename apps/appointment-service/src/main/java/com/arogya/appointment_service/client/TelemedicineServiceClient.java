package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Calls telemedicine-service to create (or retrieve) a video session for an
 * ONLINE appointment.  The endpoint is idempotent: if a session already exists
 * for the given appointmentId, the existing meeting URL is returned unchanged.
 *
 * Telemedicine-service endpoint:
 *   POST /api/v1/telemedicine/sessions
 *   Body: { "appointmentId", "patientId", "doctorId", "startsAt"? }
 *   Response: { "data": { "meetingUrl": "https://..." } }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelemedicineServiceClient {

    private final RestTemplate restTemplate;
    private final String telemedicineServiceUrl;

    /**
     * Creates (or retrieves) a telemedicine session and returns the meeting URL.
     *
     * @param startsAt ISO-8601 datetime string for the slot start time; may be null,
     *                 in which case the telemedicine service defaults to now.
     */
    public String createSession(String appointmentId, String patientId, String doctorId, String startsAt) {
        String url = telemedicineServiceUrl + "/api/v1/telemedicine/sessions";

        Map<String, String> body = new HashMap<>();
        body.put("appointmentId", appointmentId);
        body.put("patientId", patientId);
        body.put("doctorId", doctorId);
        if (startsAt != null) {
            body.put("startsAt", startsAt);
        }

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);
            if (response.getBody() == null) {
                throw new RuntimeException("Telemedicine service returned an empty response");
            }
            // Response shape: { "success": true, "data": { "meetingUrl": "..." } }
            Object data = response.getBody().get("data");
            if (!(data instanceof Map<?, ?> dataMap) || !dataMap.containsKey("meetingUrl")) {
                throw new RuntimeException("Telemedicine service returned an invalid response");
            }
            return (String) dataMap.get("meetingUrl");
        } catch (RestClientException e) {
            log.error("Failed to create telemedicine session for appointment {}: {}", appointmentId, e.getMessage());
            throw new RuntimeException("Could not create telemedicine session. Please try again or choose a physical appointment.", e);
        }
    }

    /**
     * Convenience overload used at booking time when no slot start time is available yet.
     */
    public String createSession(String appointmentId, String patientId, String doctorId) {
        return createSession(appointmentId, patientId, doctorId, null);
    }
}
