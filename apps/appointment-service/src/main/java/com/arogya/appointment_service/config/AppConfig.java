package com.arogya.appointment_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Configuration
public class AppConfig {

    @Value("${services.doctor.url}")
    private String doctorServiceUrl;

    @Value("${services.telemedicine.url}")
    private String telemedicineServiceUrl;

    @Value("${services.patient.url}")
    private String patientServiceUrl;

    @Value("${services.payment.url}")
    private String paymentServiceUrl;

    @Value("${services.notification.url}")
    private String notificationServiceUrl;

    /**
     * RestTemplate that keeps all default message converters but replaces the
     * Jackson one with a converter that shares the app-configured ObjectMapper
     * (which has JavaTimeModule and WRITE_DATES_AS_TIMESTAMPS=false).
     *
     * Replacing the whole converter list (as done previously) removed
     * ByteArrayHttpMessageConverter, StringHttpMessageConverter, etc., which
     * caused HttpMessageConversionException when a downstream service returned
     * a non-JSON body (e.g. an HTML error page) — those exceptions are NOT
     * RestClientException subclasses and therefore escaped the catch clauses.
     */
    @Value("${services.telemedicine.consultation-expiration-hours:24}")
    private Integer telemedicineConsultationExpirationHours;

    @Bean
    public RestTemplate restTemplate(ObjectMapper objectMapper) {
        RestTemplate rt = new RestTemplate();
        rt.getMessageConverters().removeIf(c -> c instanceof MappingJackson2HttpMessageConverter);
        rt.getMessageConverters().add(new MappingJackson2HttpMessageConverter(objectMapper));
        return rt;
    }

    @Bean
    public String doctorServiceUrl() {
        return doctorServiceUrl;
    }

    @Bean
    public String telemedicineServiceUrl() {
        return telemedicineServiceUrl;
    }

    @Bean
    public String paymentServiceUrl() {
        return paymentServiceUrl;
    }

    @Bean
    public String notificationServiceUrl() {
        return notificationServiceUrl;
    }

    @Bean
    public String patientServiceUrl() {
        return patientServiceUrl;
    }
    
    @Bean
    public Integer telemedicineConsultationExpirationHours() {
        return telemedicineConsultationExpirationHours;
    }
}
