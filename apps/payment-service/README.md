# Payment Service

## Overview

The Payment Service handles all financial transactions within the Arogya platform using **Stripe Checkout**. It creates checkout sessions, processes webhooks, generates receipts, and provides payment history for both patients and doctors.

**Technology:** Node.js 20 + TypeScript + Express 5 + Mongoose  
**Port:** `8087`  
**Domain:** Payment  
**Database:** MongoDB (`arogya_payments`) via MongoDB Atlas  
**Payment Gateway:** Stripe (sandbox / live)

---

## API Endpoints

| Method | Route                                           | Auth                                        | Description                         |
| ------ | ----------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| `POST` | `/api/payments/initiate`                        | Service-to-service                          | Create Stripe Checkout Session      |
| `POST` | `/api/payments/webhook`                         | Stripe signature                            | Handle Stripe webhook events        |
| `GET`  | `/api/payments/me`                              | `requireUser`                               | Patient payment history (paginated) |
| `GET`  | `/api/payments/doctor/me`                       | `requireUser` + `requireRole(doctor,admin)` | Doctor dashboard with summary       |
| `GET`  | `/api/payments/:id`                             | `requireUser`                               | Single payment / receipt            |
| `POST` | `/api/payments/dev/simulate-success/:paymentId` | Dev only                                    | Simulate Stripe success             |
| `GET`  | `/health`                                       | None                                        | Health check                        |

---

## Quick Start

### Prerequisites

- Node.js 20.x
- MongoDB (Atlas or local)
- Stripe account with API keys

### Setup

```bash
cd apps/payment-service
npm install
cp .env.example .env
# Fill in MONGODB_URI, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

### Run locally

```bash
npm run dev
```

### Run with Stripe CLI (recommended for webhook testing)

```powershell
.\scripts\start-dev.ps1
```

This starts the Stripe CLI webhook listener and the dev server together.

---

## Environment Variables

| Variable                | Required | Description                                                    |
| ----------------------- | -------- | -------------------------------------------------------------- |
| `PORT`                  | No       | Server port (default: `8087`)                                  |
| `MONGODB_URI`           | Yes      | MongoDB connection string                                      |
| `STRIPE_SECRET_KEY`     | Yes      | Stripe secret key (`sk_test_...` or `sk_live_...`)             |
| `STRIPE_WEBHOOK_SECRET` | No       | Stripe webhook signing secret (`whsec_...`)                    |
| `FRONTEND_URL`          | No       | Redirect URL after checkout (default: `http://localhost:5173`) |
| `KAFKA_BROKER`          | No       | Kafka broker address (Kafka integration commented out)         |

---

## Project Structure

```
src/
├── main.ts                    # Express app + server startup
├── config/
│   ├── env.ts                 # Environment validation
│   ├── database.ts            # Mongoose connection
│   ├── stripe.ts              # Stripe client
│   └── kafka.ts               # Kafka producer (commented out)
├── models/
│   ├── payment.model.ts       # Payment schema + indexes
│   └── paymentEvent.model.ts  # Audit trail schema
├── services/
│   ├── payment.service.ts     # Core business logic
│   └── kafka.service.ts       # Event publishing (commented out)
├── controllers/
│   └── payment.controller.ts  # Request handlers
├── routes/
│   └── payment.routes.ts      # Route definitions
├── middleware/
│   └── auth.middleware.ts      # requireUser, requireRole
├── types/
│   └── payment.types.ts       # TypeScript interfaces
└── utils/
    ├── apiResponse.ts          # Standardized response helpers
    └── receipt.ts              # Receipt number generator
```

---

## Payment Flow

```
1. Appointment-service calls POST /api/payments/initiate
   → Payment created as PENDING, Stripe Checkout Session returned

2. Patient opens checkoutUrl in browser
   → Completes payment on Stripe's hosted page

3. Stripe sends webhook to POST /api/payments/webhook
   → Payment updated to SUCCESS, receipt generated (RCP-YYYYMMDD-XXXX)

4. Patient views history via GET /api/payments/me
   Doctor views dashboard via GET /api/payments/doctor/me
```

---

## Integration

The appointment-service needs configuration changes to integrate with this service. See [docs/appointment-service-integration.md](docs/appointment-service-integration.md) for details.

---

## Docker

```bash
docker build -t arogya/payment-service:latest .
```

Or via docker-compose from repo root:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml up payment-service
```

Requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set in the environment or `.env` file next to `docker-compose.dev.yml`.

---

## Port Reference

| Service              | Port     |
| -------------------- | -------- |
| api-gateway          | 3000     |
| auth-service         | 8081     |
| patient-service      | 8082     |
| doctor-service       | 8083     |
| appointment-service  | 8084     |
| prescription-service | 8085     |
| telemedicine-service | 8086     |
| **payment-service**  | **8087** |
| notification-service | 3002     |
| ai-symptom-checker   | 8089     |

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
