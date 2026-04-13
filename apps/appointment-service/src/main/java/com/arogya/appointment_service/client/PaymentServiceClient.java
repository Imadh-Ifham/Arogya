package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Calls payment-service to initiate payment for a confirmed booking.
 *
 * Payment-service exposes:
 *   POST /api/payments/initiate  →  { paymentId, status, amount, currency }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentServiceClient {

    private final RestTemplate restTemplate;
    private final String paymentServiceUrl;

    /**
     * Initiates a payment for the appointment.
     *
     * @return the paymentId returned by the payment service, or null if the call failed
     * @throws RuntimeException if the payment service rejects the request (non-2xx)
     */
    public String initiatePayment(String appointmentId, BigDecimal amount, String patientId) {
        String url = paymentServiceUrl + "/api/payments/initiate";
        Map<String, Object> body = Map.of(
                "appointmentId", appointmentId,
                "amount", amount,
                "patientId", patientId,
                "currency", "LKR"
        );
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object paymentId = response.getBody().get("paymentId");
                return paymentId != null ? paymentId.toString() : null;
            }
            throw new RuntimeException("Payment service returned non-success status: " + response.getStatusCode());
        } catch (RestClientException e) {
            log.error("Payment service unreachable for appointment {}: {}", appointmentId, e.getMessage());
            throw new RuntimeException("Payment service unavailable — booking rolled back", e);
        }
    }
}
