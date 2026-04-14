package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Calls notification-service to send event-driven notifications.
 * All calls are fire-and-forget: a notification failure must never fail a booking.
 *
 * Notification-service exposes:
 *   POST /api/notifications/send
 *   Request: {
 *     eventType: string,          // e.g. "APPOINTMENT_CONFIRMATION"
 *     patientId?: string,         // notification-service resolves email from patient-service
 *     doctorId?: string,          // notification-service resolves email from doctor-service
 *     templateVariables?: {...}   // merged into the template body
 *   }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationServiceClient {

    private final RestTemplate restTemplate;
    private final String notificationServiceUrl;

    // ─── Patient-facing notifications ────────────────────────────────────────

    /**
     * Sent to the patient after their payment succeeds.
     * Event type: APPOINTMENT_CONFIRMATION
     */
    public void sendBookingConfirmedToPatient(String appointmentId, String patientId,
                                              String appointmentDateTime) {
        Map<String, String> vars = new HashMap<>();
        vars.put("appointmentId", appointmentId);
        if (appointmentDateTime != null) vars.put("appointmentDateTime", appointmentDateTime);
        send("APPOINTMENT_CONFIRMATION", patientId, null, vars);
    }

    /**
     * Sent to the patient when the doctor accepts their appointment.
     * Event type: APPOINTMENT_ACCEPTED
     */
    public void sendAppointmentAccepted(String appointmentId, String patientId, String doctorId) {
        Map<String, String> vars = Map.of("appointmentId", appointmentId);
        send("APPOINTMENT_ACCEPTED", patientId, null, vars);
    }

    /**
     * Sent to the patient when the doctor rejects their appointment.
     * Event type: APPOINTMENT_REJECTED
     */
    public void sendAppointmentRejected(String appointmentId, String patientId, String doctorId) {
        Map<String, String> vars = Map.of("appointmentId", appointmentId);
        send("APPOINTMENT_REJECTED", patientId, null, vars);
    }

    // ─── Doctor-facing notifications ─────────────────────────────────────────

    /**
     * Sent to the doctor when a patient's payment succeeds and the appointment
     * is ready for review.
     * Event type: NEW_APPOINTMENT_REQUEST
     */
    public void sendNewAppointmentToDoctor(String appointmentId, String doctorId,
                                           String appointmentDateTime) {
        Map<String, String> vars = new HashMap<>();
        vars.put("appointmentId", appointmentId);
        if (appointmentDateTime != null) vars.put("appointmentDateTime", appointmentDateTime);
        send("NEW_APPOINTMENT_REQUEST", null, doctorId, vars);
    }

    // ─── Core dispatch ────────────────────────────────────────────────────────

    private void send(String eventType, String patientId, String doctorId,
                      Map<String, String> templateVariables) {
        String url = notificationServiceUrl + "/api/notifications/send";

        Map<String, Object> body = new HashMap<>();
        body.put("eventType", eventType);
        if (patientId != null) body.put("patientId", patientId);
        if (doctorId  != null) body.put("doctorId",  doctorId);
        if (templateVariables != null && !templateVariables.isEmpty()) {
            body.put("templateVariables", templateVariables);
        }

        try {
            restTemplate.postForEntity(url, body, Map.class);
        } catch (RestClientException e) {
            log.warn("Notification service unreachable for event '{}': {}", eventType, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending notification '{}': {}", eventType, e.getMessage());
        }
    }
}
