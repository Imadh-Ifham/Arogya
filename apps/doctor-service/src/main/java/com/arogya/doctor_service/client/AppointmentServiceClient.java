package com.arogya.doctor_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Notifies appointment-service to regenerate slots for a doctor when their
 * availability templates change.  Fire-and-forget — failures are logged but
 * never propagated to the caller.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentServiceClient {

    private final RestTemplate restTemplate;
    private final String appointmentServiceUrl;

    /**
     * Asks appointment-service to delete and recreate all AVAILABLE slots for
     * {@code doctorId} based on the latest availability templates.
     */
    public void regenerateSlots(String doctorId) {
        String url = appointmentServiceUrl + "/api/appointments/slots/regenerate/" + doctorId;
        try {
            restTemplate.postForEntity(url, null, Void.class);
            log.info("AppointmentServiceClient: slot regeneration triggered for doctor {}", doctorId);
        } catch (RestClientException e) {
            log.warn("AppointmentServiceClient: could not trigger slot regeneration for doctor {}: {}",
                    doctorId, e.getMessage());
        }
    }
}
