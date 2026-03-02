# Payment Service

## Overview

The Payment Service handles all financial transactions within the Arogya platform, including consultation fees, subscription billing, and payment gateway integration. It maintains a tamper-resistant transaction ledger and publishes events on successful payments.

**Technology:** Node.js 20 + TypeScript  
**Port:** `8087`  
**Domain:** Payment  
**Database:** PostgreSQL (`arogya_payments`) — private, not shared  
**Status:** Not yet implemented — placeholder directory only

---

## Responsibilities

- Initiate and verify payment requests with the payment gateway (Stripe / Razorpay)
- Handle payment webhooks from the gateway
- Store transaction records in the payments database
- Publish `payment.completed` Kafka event on successful transactions
- Refund management

---

## How to Create This Service from Scratch

### Prerequisites

- Node.js 20.x
- npm 9.x or newer

### Step 1 — Initialize the project

```bash
cd apps/payment-service
npm init -y
npm install typescript ts-node @types/node
npm install fastify @fastify/jwt dotenv
npm install kafkajs pg stripe
npm install @types/pg @types/stripe
npm install --save-dev ts-node-dev nodemon
npx tsc --init
```

> Substitute `stripe` with `razorpay` if targeting the Indian market.

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

### Step 4 — Create `.env` (local dev only — never commit)

```env
PORT=8087
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=arogya_payments
DB_USER=arogya
DB_PASSWORD=arogya_secret
KAFKA_BROKER=localhost:9093
KAFKA_TOPIC_PAYMENT_COMPLETED=payment.completed
PAYMENT_GATEWAY_KEY=your-dev-key
PAYMENT_GATEWAY_SECRET=your-dev-secret
WEBHOOK_SECRET=your-webhook-secret
```

### Step 5 — Create `src/main.ts`

- Fastify server with JWT verification
- Register routes: `POST /payments/initiate`, `POST /payments/webhook`, `GET /payments/:id`
- Integrate payment gateway SDK
- Store transactions in PostgreSQL
- Produce `payment.completed` on webhook success
- Listen on `PORT`

### Step 6 — Build and Dockerize

```bash
npm run build
docker build -t arogya/payment-service:latest .
```

---

## Kafka Events

| Event             | Topic               | Trigger            | Consumers                                 |
| ----------------- | ------------------- | ------------------ | ----------------------------------------- |
| Payment completed | `payment.completed` | Successful webhook | notification-service, appointment-service |

---

## Database Ownership

- This service owns `arogya_payments` in PostgreSQL exclusively.
- Transaction records must never be modified after creation (append-only ledger).
- No other service reads from this database directly.

---

## Environment Variables

| Variable                        | Required | Description                        |
| ------------------------------- | -------- | ---------------------------------- |
| `PORT`                          | Yes      | `8087`                             |
| `NODE_ENV`                      | Yes      | Runtime environment                |
| `DB_HOST`                       | Yes      | `postgres` (Docker) or `localhost` |
| `DB_PORT`                       | Yes      | `5432`                             |
| `DB_NAME`                       | Yes      | `arogya_payments`                  |
| `DB_USER`                       | Yes      | `arogya`                           |
| `DB_PASSWORD`                   | Yes      | Database password                  |
| `KAFKA_BROKER`                  | Yes      | `kafka:9092`                       |
| `KAFKA_TOPIC_PAYMENT_COMPLETED` | No       | `payment.completed`                |
| `PAYMENT_GATEWAY_KEY`           | Yes      | Gateway public/API key             |
| `PAYMENT_GATEWAY_SECRET`        | Yes      | Gateway secret key                 |
| `WEBHOOK_SECRET`                | Yes      | Webhook signature secret           |

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

- Service name: `payment-service`
- Docker image: `arogya/payment-service:latest`
- Kubernetes service: `payment-service-svc`
- Namespace: `arogya`
