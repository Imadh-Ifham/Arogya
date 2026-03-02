# Doctor Service

## Overview

The Doctor Service manages doctor profiles, specializations, availability schedules, and verification status within the Arogya platform. It does not own authentication — identity is delegated to auth-service.

**Technology:** Spring Boot 3.x + Java 17 + Maven  
**Port:** `8083`  
**Domain:** Doctor  
**Database:** PostgreSQL (`arogya_doctors`) — private, not shared  
**Status:** Not yet implemented — placeholder directory only

---

## Responsibilities

- Create and manage doctor profiles
- Store specialization, qualifications, and license information
- Manage availability schedules and time slots
- Expose doctor data to appointment-service via internal API
- Support search and filtering for the booking flow

---

## How to Create This Service from Scratch

### Step 1 — Generate with Spring Initializr

Visit [https://start.spring.io](https://start.spring.io) and configure:

| Field       | Value               |
| ----------- | ------------------- |
| Project     | Maven               |
| Language    | Java                |
| Spring Boot | 3.x (latest stable) |
| Java        | 17                  |
| Group       | `com.arogya`        |
| Artifact    | `doctor-service`    |
| Packaging   | Jar                 |

**Dependencies:**

- Spring Web
- Spring Data JPA
- Spring Security
- PostgreSQL Driver
- Spring for Apache Kafka
- Lombok
- Spring Boot Actuator
- Validation

Extract ZIP into `apps/doctor-service/` so `pom.xml` is at the root.

### Step 2 — Create `src/main/resources/application.yml`

```yaml
server:
  port: 8083

spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  kafka:
    bootstrap-servers: ${SPRING_KAFKA_BOOTSTRAP_SERVERS}
```

### Step 3 — Build

```bash
mvn clean package -DskipTests
```

### Step 4 — Dockerize

Uncomment the `Dockerfile` in this directory, then:

```bash
docker build -t arogya/doctor-service:latest .
```

---

## Database Ownership

- This service owns `arogya_doctors` in PostgreSQL exclusively.
- Other services do not query this database directly.
- Data is exposed only via this service's REST API.

---

## Environment Variables

| Variable                         | Required | Description                                      |
| -------------------------------- | -------- | ------------------------------------------------ |
| `SERVER_PORT`                    | Yes      | `8083`                                           |
| `SPRING_PROFILES_ACTIVE`         | Yes      | `docker` or `local`                              |
| `SPRING_DATASOURCE_URL`          | Yes      | `jdbc:postgresql://postgres:5432/arogya_doctors` |
| `SPRING_DATASOURCE_USERNAME`     | Yes      | `arogya`                                         |
| `SPRING_DATASOURCE_PASSWORD`     | Yes      | Database password                                |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | Yes      | `kafka:9092`                                     |
| `AUTH_SERVICE_URL`               | Yes      | `http://auth-service:8081`                       |

---

## Port Reference

| Service                    | Port |
| -------------------------- | ---- |
| api-service                | 8080 |
| auth-service               | 8081 |
| patient-service            | 8082 |
| doctor-service             | 8083 |
| appointment-service        | 8084 |
| prescription-service       | 8085 |
| telemedicine-service       | 8086 |
| payment-service            | 8087 |
| notification-service       | 8088 |
| ai-symptom-checker-service | 8089 |

---

## Naming Conventions

- Service name: `doctor-service`
- Maven artifact ID: `doctor-service`
- Base package: `com.arogya.doctor`
- Docker image: `arogya/doctor-service:latest`
- Kubernetes service: `doctor-service-svc`
- Namespace: `arogya`
