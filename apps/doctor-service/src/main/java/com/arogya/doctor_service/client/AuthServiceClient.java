package com.arogya.doctor_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class AuthServiceClient {

    private final RestTemplate restTemplate;
    private final String authBaseUrl;

    public AuthServiceClient(@Value("${auth-service.base-url}") String authBaseUrl) {
        this.restTemplate = new RestTemplate();
        this.authBaseUrl = authBaseUrl;
    }

    public Map<String, Object> validateToken(String bearerToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", bearerToken); // pass "Bearer <token>" as-is
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
            authBaseUrl + "/api/auth/me",
            HttpMethod.GET,
            entity,
            Map.class
        );
        // auth-service wraps the user object under a "data" key:
        // { "success": true, "data": { "_id": "...", "role": "...", ... } }
        Map<String, Object> body = response.getBody();
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        return data;
    }
}
