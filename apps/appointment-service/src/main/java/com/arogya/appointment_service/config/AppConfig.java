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

    @Value("${services.payment.url}")
    private String paymentServiceUrl;

    @Value("${services.notification.url}")
    private String notificationServiceUrl;

    /**
     * RestTemplate configured with the application's ObjectMapper so that
     * Java time types (LocalTime, LocalDate, …) received from other services
     * are deserialised correctly as ISO strings rather than numeric arrays.
     * Spring Boot auto-configures the ObjectMapper with JavaTimeModule and
     * WRITE_DATES_AS_TIMESTAMPS=false.
     */
    @Bean
    public RestTemplate restTemplate(ObjectMapper objectMapper) {
        RestTemplate rt = new RestTemplate();
        // Replace the default Jackson converter with one that shares the app ObjectMapper
        rt.setMessageConverters(List.of(
                new MappingJackson2HttpMessageConverter(objectMapper)
        ));
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
}
