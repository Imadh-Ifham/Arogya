package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Calls telemedicine-service to create a video session when a patient books
 * an ONLINE appointment.
 *
 * Expected telemedicine-service endpoint:
 *   POST /api/v1/telemedicine/consultations
 *   Body: {
 *     "appointmentId": "...",
 *     "patientId": "...",
 *     "doctorId": "...",
 *     "startsAt": "...",
 *     "expirationHours": 24
 *   }
 *   Response: {
 *     "success": true,
 *     "data": { "room": { "jitsiRoomUrl": "https://..." } }
 *   }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelemedicineServiceClient {

    private final RestTemplate restTemplate;
    private final String telemedicineServiceUrl;
    private final Integer telemedicineConsultationExpirationHours;

    /**
     * Creates a telemedicine session and returns the meeting URL.
     * Throws RuntimeException if the telemedicine-service is unreachable,
     * so the booking transaction rolls back and the patient is notified.
     */
    public String createSession(
            String appointmentId,
            String patientId,
            String doctorId,
            LocalDateTime startsAt,
            String roomId
    ) {
        String url = telemedicineServiceUrl + "/api/v1/telemedicine/consultations";

        Map<String, Object> body = new HashMap<>();
        body.put("appointmentId", appointmentId);
        body.put("patientId", patientId);
        body.put("doctorId", doctorId);
        body.put("startsAt", startsAt.toString());
        body.put("expirationHours", telemedicineConsultationExpirationHours);
        if (roomId != null && !roomId.isBlank()) {
            body.put("roomId", roomId);
        }

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);

            if (response.getBody() == null || !response.getBody().containsKey("data")) {
                throw new RuntimeException("Telemedicine service returned an invalid response");
            }

            Object dataObj = response.getBody().get("data");
            if (!(dataObj instanceof Map<?, ?> data)) {
                throw new RuntimeException("Telemedicine service returned an invalid response");
            }

            Object roomObj = data.get("room");
            if (!(roomObj instanceof Map<?, ?> room)) {
                throw new RuntimeException("Telemedicine service returned an invalid response");
            }

            Object meetingUrl = room.get("jitsiRoomUrl");
            if (!(meetingUrl instanceof String urlValue) || urlValue.isBlank()) {
                throw new RuntimeException("Telemedicine service returned an invalid response");
            }

            return urlValue;
        } catch (RestClientException e) {
            log.error("Failed to create telemedicine session for appointment {}: {}", appointmentId, e.getMessage());
            throw new RuntimeException("Could not create telemedicine session. Please try again or choose a physical appointment.", e);
        }
    }
}
