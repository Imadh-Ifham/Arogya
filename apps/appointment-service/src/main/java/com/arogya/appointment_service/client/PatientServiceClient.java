package com.arogya.appointment_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

/**
 * Calls patient-service to resolve patient display names for the doctor dashboard.
 *
 * Patient-service exposes:
 *   GET /patients/profile/{authUserId}  →  PatientProfileResponse (firstName, lastName, …)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PatientServiceClient {

    private final RestTemplate restTemplate;
    private final String patientServiceUrl;

    /**
     * Returns the patient's full name ("First Last") for the given authUserId.
     * Returns empty if the patient has no profile or the service is unreachable.
     */
    public Optional<String> getPatientName(String patientAuthUserId) {
        String url = patientServiceUrl + "/patients/profile/" + patientAuthUserId;
        try {
            ResponseEntity<PatientInfo> response = restTemplate.getForEntity(url, PatientInfo.class);
            PatientInfo info = response.getBody();
            if (info == null) return Optional.empty();
            String name = buildName(info.getFirstName(), info.getLastName());
            return name.isBlank() ? Optional.empty() : Optional.of(name);
        } catch (RestClientException e) {
            log.warn("Patient-service unreachable when fetching name for patient {}: {}", patientAuthUserId, e.getMessage());
            return Optional.empty();
        }
    }

    private static String buildName(String first, String last) {
        String f = first  != null ? first.trim()  : "";
        String l = last   != null ? last.trim()   : "";
        if (!f.isEmpty() && !l.isEmpty()) return f + " " + l;
        return f.isEmpty() ? l : f;
    }

    /** Minimal projection of PatientProfileResponse — only the fields we need. */
    public static class PatientInfo {
        private String firstName;
        private String lastName;

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
    }
}
