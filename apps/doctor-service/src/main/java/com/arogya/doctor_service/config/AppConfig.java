package com.arogya.doctor_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Configuration
public class AppConfig {

    @Value("${services.appointment.url}")
    private String appointmentServiceUrl;

    /**
     * Uses Spring Boot's auto-configured ObjectMapper (which includes JavaTimeModule
     * and WRITE_DATES_AS_TIMESTAMPS=false) so that LocalTime/LocalDate fields in
     * AvailabilityTemplate responses serialize as ISO strings, not arrays or POJOs.
     */
    @Bean
    public RestTemplate restTemplate(ObjectMapper objectMapper) {
        RestTemplate rt = new RestTemplate();
        rt.setMessageConverters(List.of(
                new MappingJackson2HttpMessageConverter(objectMapper)
        ));
        return rt;
    }

    @Bean
    public String appointmentServiceUrl() {
        return appointmentServiceUrl;
    }
}
