package com.arogya.patient.client;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.arogya.patient.dto.PrescriptionDto;

@Component
public class PrescriptionClient {

    private static final Logger log = LoggerFactory.getLogger(PrescriptionClient.class);

    private final RestTemplate restTemplate;
    private final String prescriptionServiceUrl;

    public PrescriptionClient(
            RestTemplate restTemplate,
            @Value("${services.prescription.url}") String prescriptionServiceUrl) {
        this.restTemplate = restTemplate;
        this.prescriptionServiceUrl = prescriptionServiceUrl;
    }

    /**
     * Fetches prescriptions for a patient from the prescription-service.
     * Returns an empty list if the service is unavailable — callers must handle
     * this gracefully.
     */
    public List<PrescriptionDto> getPrescriptionsForPatient(UUID patientId) {
        try {
            String url = prescriptionServiceUrl + "/prescriptions/patient/" + patientId;
            PrescriptionDto[] result = restTemplate.getForObject(url, PrescriptionDto[].class);
            return result != null ? Arrays.asList(result) : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Prescription service unavailable for patient {}: {}", patientId, e.getMessage());
            return Collections.emptyList();
        }
    }
}
