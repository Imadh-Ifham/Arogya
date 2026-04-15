package com.arogya.appointment_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // The Gateway already verified the JWT and forwarded decoded
        // user info as headers. We trust these because they only come
        // from the internal Docker network — no external client can set them.
        String userId = request.getHeader("x-user-id");
        String role   = request.getHeader("x-user-role");
        String email  = request.getHeader("x-user-email");

        log.info("[JwtAuthFilter] {} {} | x-user-id={}, x-user-role={}",
                request.getMethod(), request.getRequestURI(), userId, role);

        if (userId != null && role != null) {
            // Build Spring Security context from the trusted headers
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                );
            auth.setDetails(Map.of("email", email != null ? email : "", "role", role));
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.info("[JwtAuthFilter] Authenticated userId={} role={}", userId, role);
        } else {
            log.warn("[JwtAuthFilter] No user headers — request will be unauthenticated: {} {}",
                    request.getMethod(), request.getRequestURI());
        }

        chain.doFilter(request, response);
    }
}
