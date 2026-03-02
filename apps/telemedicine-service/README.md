# Telemedicine Service

## Overview

The Telemedicine Service powers real-time video consultations between patients and doctors using WebRTC and signalling infrastructure. It publishes events when a consultation starts.

**Technology:** Node.js + TypeScript + Fastify
**Port:** `8086`
**Domain:** Telemedicine
**Database:** MongoDB (`arogya_telemedicine`)  session and recording metadata
**Kafka Events Produced:** `consultation.started`
**Status:** Not yet implemented  placeholder directory only

## Responsibilities

- Manage video consultation sessions (create, join, end)
- Handle WebRTC signalling (offer/answer/ICE candidates)
- Store session metadata and recording references in MongoDB
- Publish `consultation.started` Kafka event on session creation

## How to Create This Service from Scratch

### Step 1  Initialise the project

`ash
mkdir src && cd apps/telemedicine-service
npm init -y
npm install fastify @fastify/websocket kafkajs mongoose dotenv
npm install -D typescript ts-node @types/node
npx tsc --init
`

### Step 2  src/index.ts skeleton

`	ypescript
import Fastify from 'fastify';
import websocket from '@fastify/websocket';

const app = Fastify({ logger: true });
app.register(websocket);

app.get('/health', async () => ({ status: 'ok', service: 'telemedicine-service' }));

app.listen({ port: Number(process.env.PORT ?? 8086), host: '0.0.0.0' });
`

### Step 3  Build and Dockerize

`ash
npm run build
docker build -t arogya/telemedicine-service:latest .
`

## Kafka Events

| Event | Topic | Consumers |
|---|---|---|
| Consultation started | `consultation.started` | notification-service, prescription-service |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| PORT | Yes | `8086` |
| NODE_ENV | Yes | `production` or `development` |
| MONGODB_URI | Yes | `mongodb://mongodb:27017/arogya_telemedicine` |
| KAFKA_BROKERS | Yes | `kafka:9092` |
| KAFKA_TOPIC_CONSULTATION_STARTED | No | `consultation.started` |
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

- Service name: `telemedicine-service`
- NPM package name: `@arogya/telemedicine-service`
- Docker image: `arogya/telemedicine-service:latest`
- Kubernetes service: `telemedicine-service-svc`
- Namespace: `arogya`
