# Notification Service

## Overview

The Notification Service consumes Kafka events from all other services and dispatches real-time notifications to users via push notifications, email, and in-app channels.

**Technology:** Node.js + TypeScript + Fastify
**Port:** `8088`
**Domain:** Notification
**Database:** MongoDB (`arogya_notifications`)  notification logs and delivery status
**Kafka Events Consumed:** `appointment.created`, `prescription.issued`, `consultation.started`, `payment.completed`, `ai.symptom.analyzed`, `auth.user.registered`
**Status:** Not yet implemented  placeholder directory only

## Responsibilities

- Subscribe to all domain Kafka topics
- Route events to the appropriate notification channel (email, push, in-app)
- Log delivery status per notification
- Expose read APIs for a user's notification history

## How to Create This Service from Scratch

### Step 1  Initialise the project

`ash
mkdir src && cd apps/notification-service
npm init -y
npm install fastify kafkajs mongoose nodemailer dotenv
npm install -D typescript ts-node @types/node
npx tsc --init
`

### Step 2  src/index.ts skeleton

`	ypescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', service: 'notification-service' }));

app.listen({ port: Number(process.env.PORT ?? 8088), host: '0.0.0.0' });
`

### Step 3  Build and Dockerize

`ash
npm run build
docker build -t arogya/notification-service:latest .
`

## Kafka Events Consumed

| Topic | Trigger | Action |
|---|---|---|
| `appointment.created` | New booking confirmed | Send confirmation to patient + doctor |
| `prescription.issued` | Doctor issues prescription | Send prescription ready alert to patient |
| `consultation.started` | Video session begins | Send join link to both parties |
| `payment.completed` | Payment processed | Send receipt to patient |
| `ai.symptom.analyzed` | AI report ready | Send analysis result to patient |
| `auth.user.registered` | New user signup | Send welcome email |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| PORT | Yes | `8088` |
| NODE_ENV | Yes | `production` or `development` |
| MONGODB_URI | Yes | `mongodb://mongodb:27017/arogya_notifications` |
| KAFKA_BROKERS | Yes | `kafka:9092` |
| SMTP_HOST | Yes | SMTP server for email delivery |
| SMTP_PORT | No | Default `587` |
| SMTP_USER | Yes | SMTP username |
| SMTP_PASS | Yes | SMTP password |
| FCM_SERVER_KEY | No | Firebase Cloud Messaging key for push |

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

- Service name: `notification-service`
- NPM package name: `@arogya/notification-service`
- Docker image: `arogya/notification-service:latest`
- Kubernetes service: `notification-service-svc`
- Namespace: `arogya`
