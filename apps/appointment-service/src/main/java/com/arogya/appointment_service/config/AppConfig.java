package com.arogya.appointment_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Value("${services.doctor.url}")
    private String doctorServiceUrl;

    @Value("${services.telemedicine.url}")
    private String telemedicineServiceUrl;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public String doctorServiceUrl() {
        return doctorServiceUrl;
    }

    @Bean
    public String telemedicineServiceUrl() {
        return telemedicineServiceUrl;
    }
}
