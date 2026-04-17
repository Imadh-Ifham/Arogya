# =============================================================================
# Arogya - Appointment Service
# Technology: Spring Boot 3.5 + Java 21 + Maven
# Port: 8084
# =============================================================================

# ---------- Build Stage ----------
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy pom.xml first so Maven dependency layer is cached separately from source.
# Docker only re-runs this layer when pom.xml changes, not on every src change.
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source and build the JAR
COPY src/ ./src/
RUN mvn clean package -DskipTests -B

# ---------- Production Stage ----------
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Run as a non-root user
RUN addgroup -S arogya && adduser -S arogya -G arogya
USER arogya

# Copy only the built JAR — nothing else from the build stage
COPY --from=builder /app/target/appointment-service-*.jar app.jar

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
	CMD wget -qO- http://localhost:8084/actuator/health >/dev/null || exit 1

EXPOSE 8084

# Container-aware JVM memory settings for Kubernetes limits
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:InitialRAMPercentage=25.0 -XX:MaxRAMPercentage=75.0"

CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
