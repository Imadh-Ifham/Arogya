# Prescription Service

## Overview

The Prescription Service handles digital prescriptions issued by doctors after consultations. It stores structured prescription records and publishes events for the notification and AI services.

**Technology:** Spring Boot 3.x + Java 17 + Maven
**Port:** `8085`
**Domain:** Prescription
**Database:** PostgreSQL (`arogya_prescriptions`)  private, not shared
**Kafka Events Produced:** `prescription.issued`
**Status:** Not yet implemented  placeholder directory only

## Responsibilities

- Create and store digital prescriptions
- Link prescriptions to appointments and consultations
- Publish `prescription.issued` Kafka event after issuance
- Support read/download of prescription records for patients and doctors

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
| Artifact | `prescription-service` |
| Packaging | Jar |

Dependencies: Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Spring for Apache Kafka, Lombok, Spring Boot Actuator, Validation

Extract ZIP into `apps/prescription-service/` so `pom.xml` is at the root.

### Step 2  Configure `application.yml`

`yaml
server:
  port: 8085
spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/arogya_prescriptions
    username: arogya
    password: change_me
  kafka:
    bootstrap-servers: kafka:9092
`

### Step 3  Build

`
mvn clean package -DskipTests
`

### Step 4  Dockerize

Uncomment the Dockerfile, then:

`
docker build -t arogya/prescription-service:latest .
`

## Kafka Events

| Event | Topic | Consumers |
|---|---|---|
| Prescription issued | `prescription.issued` | notification-service, ai-symptom-checker-service |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| SERVER_PORT | Yes | `8085` |
| SPRING_PROFILES_ACTIVE | Yes | `docker` or `local` |
| SPRING_DATASOURCE_URL | Yes | `jdbc:postgresql://postgres:5432/arogya_prescriptions` |
| SPRING_DATASOURCE_USERNAME | Yes | `arogya` |
| SPRING_DATASOURCE_PASSWORD | Yes | Database password |
| SPRING_KAFKA_BOOTSTRAP_SERVERS | Yes | `kafka:9092` |
| KAFKA_TOPIC_PRESCRIPTION_ISSUED | No | `prescription.issued` |
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

- Service name: `prescription-service`
- Maven artifact ID: `prescription-service`
- Base package: `com.arogya.prescription`
- Docker image: `arogya/prescription-service:latest`
- Kubernetes service: `prescription-service-svc`
- Namespace: `arogya`
