package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Calls notification-service to send event-driven notifications.
 * All calls are fire-and-forget: a notification failure must never fail a booking.
 *
 * Notification-service exposes:
 *   POST /api/notifications/send  →  { notificationId, status }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationServiceClient {

    private final RestTemplate restTemplate;
    private final String notificationServiceUrl;

    /**
     * Sends an APPOINTMENT_CONFIRMED notification to the patient and doctor.
     * Failures are swallowed and logged — never propagated to the caller.
     */
    public void sendAppointmentConfirmed(String appointmentId, String patientId, String doctorId,
                                          String appointmentDateTime) {
        send("APPOINTMENT_CONFIRMED", Map.of(
                "patientId", patientId,
                "doctorId", doctorId
        ), Map.of(
                "appointmentId", appointmentId,
                "appointmentDateTime", appointmentDateTime != null ? appointmentDateTime : ""
        ));
    }

    /**
     * Sends an APPOINTMENT_ACCEPTED notification to the patient.
     */
    public void sendAppointmentAccepted(String appointmentId, String patientId, String doctorId) {
        send("APPOINTMENT_ACCEPTED", Map.of(
                "patientId", patientId,
                "doctorId", doctorId
        ), Map.of(
                "appointmentId", appointmentId
        ));
    }

    /**
     * Sends an APPOINTMENT_REJECTED notification to the patient.
     */
    public void sendAppointmentRejected(String appointmentId, String patientId, String doctorId) {
        send("APPOINTMENT_REJECTED", Map.of(
                "patientId", patientId,
                "doctorId", doctorId
        ), Map.of(
                "appointmentId", appointmentId
        ));
    }

    private void send(String type, Map<String, String> recipient, Map<String, String> data) {
        String url = notificationServiceUrl + "/api/notifications/send";
        Map<String, Object> body = Map.of("type", type, "recipient", recipient, "data", data);
        try {
            restTemplate.postForEntity(url, body, Map.class);
        } catch (RestClientException e) {
            log.warn("Notification service unreachable for event '{}': {}", type, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending notification '{}': {}", type, e.getMessage());
        }
    }
}
