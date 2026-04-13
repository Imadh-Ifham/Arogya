# =============================================================================
# Arogya - Doctor Service Dockerfile Template
# Technology: Spring Boot 3.x + Java 17 + Maven
# Port: 8083
# =============================================================================
#
# TODO: This is a template Dockerfile. Complete implementation steps before building.
#
# STEP 1 — SOURCE CODE
#   Initialize at https://start.spring.io with:
#     Project:      Maven
#     Language:     Java
#     Spring Boot:  3.x (latest stable)
#     Java:         17
#     Group:        com.arogya
#     Artifact:     doctor-service
#     Dependencies: Spring Web, Spring Data JPA, Spring Security,
#                   PostgreSQL Driver, Spring Kafka, Lombok,
#                   Spring Boot Actuator, Validation
#
#   Extract ZIP into apps/doctor-service/ so pom.xml is at the root.
#
# STEP 2 — BUILD COMMAND
#   mvn clean package -DskipTests
#   Output JAR: target/doctor-service-*.jar
#
# STEP 3 — EXPOSED PORT: 8083
#   Set in application.yml: server.port=8083
#
# STEP 4 — REQUIRED ENVIRONMENT VARIABLES
#   SERVER_PORT=8083
#   SPRING_PROFILES_ACTIVE=docker
#   SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/arogya_doctors
#   SPRING_DATASOURCE_USERNAME=arogya
#   SPRING_DATASOURCE_PASSWORD=arogya_secret
#   SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092
#   AUTH_SERVICE_URL=http://auth-service:8081
#
# STEP 5 — ONCE IMPLEMENTED, uncomment the Dockerfile below
# =============================================================================

# ---------- Build Stage ----------
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline -B
COPY src/ ./src/
RUN mvn clean package -DskipTests

# ---------- Production Stage ----------
FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app
RUN addgroup -S arogya && adduser -S arogya -G arogya
USER arogya
COPY --from=builder /app/target/doctor-service-*.jar app.jar
EXPOSE 8083
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport"
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
