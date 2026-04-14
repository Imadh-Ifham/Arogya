package com.arogya.doctor_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }

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
