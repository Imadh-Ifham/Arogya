package com.arogya.patient.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        // Fail fast — don't let a slow downstream service hang the patient-service
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(3_000);
        return new RestTemplate(factory);
    }
}
