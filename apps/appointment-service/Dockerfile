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

EXPOSE 8084

# UseContainerSupport lets the JVM read cgroup memory limits set by Docker/K8s
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport"

CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
