package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Calls payment-service to initiate a Stripe Checkout Session for a booked appointment.
 *
 * Payment-service exposes:
 *   POST /api/payments/initiate
 *   Request:  { appointmentId, amount, patientId, doctorId, currency }
 *   Response: { paymentId, checkoutUrl, status, amount, currency }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentServiceClient {

    private final RestTemplate restTemplate;
    private final String paymentServiceUrl;

    /**
     * Result returned after a successful payment initiation.
     *
     * @param paymentId   internal payment identifier, stored on the Appointment entity
     * @param checkoutUrl Stripe-hosted checkout page the patient should be redirected to
     */
    public record PaymentInitiation(String paymentId, String checkoutUrl) {}

    /**
     * Creates a Stripe Checkout Session for the given appointment.
     *
     * @return {@link PaymentInitiation} containing the paymentId and the Stripe checkoutUrl
     * @throws RuntimeException if the payment service is unreachable or returns a non-2xx
     */
    public PaymentInitiation initiatePayment(String appointmentId, BigDecimal amount,
                                             String patientId, String doctorId) {
        String url = paymentServiceUrl + "/api/payments/initiate";
        Map<String, Object> body = Map.of(
                "appointmentId", appointmentId,
                "amount",        amount,
                "patientId",     patientId,
                "doctorId",      doctorId,
                "currency",      "LKR"
        );
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<?, ?> responseBody = response.getBody();
                // payment-service wraps in { success, data } — unwrap if needed
                Object data = responseBody.containsKey("data") ? responseBody.get("data") : responseBody;
                Map<?, ?> paymentData = data instanceof Map ? (Map<?, ?>) data : responseBody;
                String paymentId   = paymentData.get("paymentId")   != null ? paymentData.get("paymentId").toString()   : null;
                String checkoutUrl = paymentData.get("checkoutUrl") != null ? paymentData.get("checkoutUrl").toString() : null;
                return new PaymentInitiation(paymentId, checkoutUrl);
            }
            throw new RuntimeException("Payment service returned non-success: " + response.getStatusCode());
        } catch (Exception e) {
            log.warn("Payment service unavailable for appointment {}: {} — appointment will remain PENDING",
                    appointmentId, e.getMessage());
            throw new RuntimeException("Payment service unavailable", e);
        }
    }
}
