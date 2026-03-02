# Appointment Service

## Overview

The Appointment Service manages the full lifecycle of medical appointments  booking, rescheduling, cancellation, and availability management. It publishes events so notification-service can inform patients and doctors.

**Technology:** Spring Boot 3.x + Java 17 + Maven
**Port:** `8084`
**Domain:** Appointment
**Database:** PostgreSQL (`arogya_appointments`)  private, not shared
**Kafka Events Produced:** `appointment.created`
**Status:** Not yet implemented  placeholder directory only

## Responsibilities

- Book, reschedule, and cancel appointments
- Fetch available time slots from doctor-service
- Publish `appointment.created` Kafka event after confirmed booking
- Manage appointment lifecycle (PENDING  CONFIRMED  COMPLETED / CANCELLED)

## How to Create This Service from Scratch

### Step 1  Generate with Spring Initializr

Visit https://start.spring.io and configure:

| Field | Value |
|---|---|
| Project | Maven |
| Language | Java |
| Spring Boot | 3.x (latest stable) |
| Java | 17 |
| Group | `com.arogya` |
| Artifact | `appointment-service` |
| Packaging | Jar |

Dependencies: Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Spring for Apache Kafka, Lombok, Spring Boot Actuator, Validation

Extract ZIP into `apps/appointment-service/` so `pom.xml` is at the root.

### Step 2  Configure `application.yml`

`yaml
server:
  port: 8084
spring:
  datasource:
    url: {SPRING_DATASOURCE_URL}
    username: {SPRING_DATASOURCE_USERNAME}
    password: {SPRING_DATASOURCE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: update
  kafka:
    bootstrap-servers: {SPRING_KAFKA_BOOTSTRAP_SERVERS}
`

### Step 3  Build

`
mvn clean package -DskipTests
`

### Step 4  Dockerize

Uncomment the Dockerfile, then:

`
docker build -t arogya/appointment-service:latest .
`

## Kafka Events

| Event | Topic | Consumers |
|---|---|---|
| Appointment booked | `appointment.created` | notification-service, payment-service |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| SERVER_PORT | Yes | `8084` |
| SPRING_PROFILES_ACTIVE | Yes | `docker` or `local` |
| SPRING_DATASOURCE_URL | Yes | `jdbc:postgresql://postgres:5432/arogya_appointments` |
| SPRING_DATASOURCE_USERNAME | Yes | `arogya` |
| SPRING_DATASOURCE_PASSWORD | Yes | Database password |
| SPRING_KAFKA_BOOTSTRAP_SERVERS | Yes | `kafka:9092` |
| KAFKA_TOPIC_APPOINTMENT_CREATED | No | `appointment.created` |
| DOCTOR_SERVICE_URL | Yes | `http://doctor-service:8083` |
| PATIENT_SERVICE_URL | Yes | `http://patient-service:8082` |

## Port Reference

| Service                    | Port |
|----------------------------|------|
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

## Naming Conventions

- Service name: `appointment-service`
- Maven artifact ID: `appointment-service`
- Base package: `com.arogya.appointment`
- Docker image: `arogya/appointment-service:latest`
- Kubernetes service: `appointment-service-svc`
- Namespace: `arogya`
