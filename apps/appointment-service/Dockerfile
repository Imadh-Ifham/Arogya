# =============================================================================
# Arogya - Appointment Service Dockerfile Template
# Technology: Spring Boot 3.x + Java 17 + Maven
# Port: 8084
# =============================================================================
#
# TODO: This is a template Dockerfile for the Appointment Service.
#       Complete the implementation steps below before building.
#
# STEP 1 â€” SOURCE CODE
#   Initialize a Spring Boot project using Spring Initializr:
#   https://start.spring.io
#
#   Settings:
#     Project:      Maven
#     Language:     Java
#     Spring Boot:  3.x (latest stable)
#     Java:         17
#     Group:        com.arogya
#     Artifact:     appointment-service
#     Dependencies: Spring Web, Spring Data JPA, Spring Security,
#                   PostgreSQL Driver, Spring Kafka, Lombok,
#                   Spring Boot Actuator, Validation
#
#   Place generated project content here (pom.xml at root of this directory).
#
# STEP 2 â€” BUILD COMMAND
#   mvn clean package -DskipTests
#   Output JAR: target/appointment-service-*.jar
#
# STEP 3 â€” EXPOSED PORT
#   This service must expose port: 8084
#   Configure in application.yml: server.port=8084
#
# STEP 4 â€” REQUIRED ENVIRONMENT VARIABLES
#   SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/arogya_appointments
#   SPRING_DATASOURCE_USERNAME=arogya
#   SPRING_DATASOURCE_PASSWORD=arogya_secret
#   SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092
#   SERVER_PORT=8084
#   SPRING_PROFILES_ACTIVE=docker
#   KAFKA_TOPIC_APPOINTMENT_CREATED=appointment.created
#
# STEP 5 â€” KAFKA EVENTS PRODUCED BY THIS SERVICE
#   - appointment.created  (when a new appointment is booked)
#
# STEP 6 â€” ONCE IMPLEMENTED, uncomment and complete the Dockerfile below
# =============================================================================

# TODO: Uncomment and complete this Dockerfile once pom.xml and src/ exist

# ---------- Build Stage ----------
# FROM maven:3.9-eclipse-temurin-17 AS builder
#
# WORKDIR /app
#
# # TODO: Copy pom.xml first for dependency caching
# COPY pom.xml ./
# RUN mvn dependency:go-offline -B
#
# # TODO: Copy source code
# COPY src/ ./src/
#
# # TODO: Build the JAR (skip tests in container build)
# RUN mvn clean package -DskipTests

# ---------- Production Stage ----------
# FROM eclipse-temurin:17-jre-alpine AS runner
#
# WORKDIR /app
#
# # TODO: Add a non-root user for security
# RUN addgroup -S arogya && adduser -S arogya -G arogya
# USER arogya
#
# # TODO: Copy the built JAR from build stage
# COPY --from=builder /app/target/appointment-service-*.jar app.jar
#
# # TODO: Expose the service port
# EXPOSE 8084
#
# # TODO: JVM tuning flags for containers
# ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport"
#
# # TODO: Set the startup command
# CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
