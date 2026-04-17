# =============================================================================
# Arogya - Doctor Service
# Technology: Spring Boot + Java 17 + Maven
# Port: 8083
# =============================================================================

# ---------- Build Stage ----------
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

COPY pom.xml ./
RUN mvn dependency:go-offline -B --no-transfer-progress

COPY src/ ./src/
RUN mvn clean package -DskipTests -B --no-transfer-progress

# ---------- Production Stage ----------
FROM eclipse-temurin:17-jre-alpine AS runner

WORKDIR /app

RUN addgroup -S arogya && adduser -S arogya -G arogya
USER arogya

COPY --from=builder /app/target/doctor-service-*.jar app.jar

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
	CMD wget -qO- http://localhost:8083/actuator/health >/dev/null || exit 1

EXPOSE 8083

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:InitialRAMPercentage=25.0 -XX:MaxRAMPercentage=75.0"

CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
