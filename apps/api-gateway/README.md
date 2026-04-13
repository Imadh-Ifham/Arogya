# API Service

## Overview

The API Service is the unified entry point for all client traffic into the Arogya platform. It proxies requests to downstream microservices, enforces JWT authentication, applies rate limiting, and handles CORS.

**Technology:** Node.js 20 + TypeScript  
**Port:** `8080`  
**Domain:** API Routing / BFF (Backend for Frontend)  
**Status:** Not yet implemented — placeholder directory only

---

## Responsibilities

- Route incoming HTTP requests to the correct downstream service
- Validate JWT tokens (issued by auth-service) before forwarding
- Apply rate limiting per IP and per user
- Handle CORS headers for web clients
- Aggregate responses where needed (BFF pattern)
- Centralized request/response logging and tracing

---

## How to Create This Service from Scratch

### Prerequisites

- Node.js 20.x
- npm 9.x or newer

### Step 1 — Initialize the project

```bash
cd apps/api-service
npm init -y
npm install typescript ts-node @types/node
npm install fastify @fastify/http-proxy @fastify/jwt @fastify/rate-limit @fastify/cors
npm install kafkajs dotenv
npm install --save-dev ts-node-dev nodemon
npx tsc --init
```

### Step 2 — Configure TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Step 3 — Add scripts to `package.json`

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js"
  }
}
```

### Step 4 — Create `src/main.ts`

- Build a Fastify server
- Register `@fastify/jwt` for token verification
- Register `@fastify/http-proxy` for each downstream service route
- Register `@fastify/rate-limit`
- Listen on `PORT` from environment

### Step 5 — Build and Dockerize

```bash
# Build TypeScript
npm run build

# Uncomment and complete the Dockerfile in this directory, then:
docker build -t arogya/api-service:latest .
```

---

## Domain Boundaries

This service routes to the following domains but owns **no business logic**:

| Route Prefix       | Downstream Service              |
| ------------------ | ------------------------------- |
| `/auth/*`          | auth-service:8081               |
| `/patients/*`      | patient-service:8082            |
| `/doctors/*`       | doctor-service:8083             |
| `/appointments/*`  | appointment-service:8084        |
| `/prescriptions/*` | prescription-service:8085       |
| `/telemedicine/*`  | telemedicine-service:8086       |
| `/payments/*`      | payment-service:8087            |
| `/notifications/*` | notification-service:8088       |
| `/ai/*`            | ai-symptom-checker-service:8089 |

---

## Environment Variables

| Variable                   | Required | Description                              |
| -------------------------- | -------- | ---------------------------------------- |
| `PORT`                     | Yes      | Listening port (must be `8080`)          |
| `NODE_ENV`                 | Yes      | Runtime environment                      |
| `AUTH_SERVICE_URL`         | Yes      | `http://auth-service:8081`               |
| `PATIENT_SERVICE_URL`      | Yes      | `http://patient-service:8082`            |
| `DOCTOR_SERVICE_URL`       | Yes      | `http://doctor-service:8083`             |
| `APPOINTMENT_SERVICE_URL`  | Yes      | `http://appointment-service:8084`        |
| `PRESCRIPTION_SERVICE_URL` | Yes      | `http://prescription-service:8085`       |
| `TELEMEDICINE_SERVICE_URL` | Yes      | `http://telemedicine-service:8086`       |
| `PAYMENT_SERVICE_URL`      | Yes      | `http://payment-service:8087`            |
| `NOTIFICATION_SERVICE_URL` | Yes      | `http://notification-service:8088`       |
| `AI_SERVICE_URL`           | Yes      | `http://ai-symptom-checker-service:8089` |
| `KAFKA_BROKER`             | No       | `kafka:9092`                             |
| `JWT_PUBLIC_KEY`           | Yes      | Public key for JWT verification          |

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

- Service name: `api-service`
- Docker image: `arogya/api-service:latest`
- Kubernetes service: `api-service-svc`
- Kubernetes deployment: `api-service-deployment`
- Namespace: `arogya`
