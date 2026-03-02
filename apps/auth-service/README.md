# Auth Service

## Overview

The Auth Service is the sole authentication and identity authority for the Arogya platform. It owns user registration, login, JWT issuance, token refresh, and role management. No other service performs authentication — all token validation is delegated to this service or done locally using the public key issued here.

**Technology:** Node.js 20 + TypeScript  
**Port:** `8081`  
**Domain:** Authentication / Identity  
**Database:** PostgreSQL (`arogya_auth`) — private, not shared  
**Status:** Not yet implemented — placeholder directory only

---

## Responsibilities

- User registration (PATIENT, DOCTOR, ADMIN roles)
- Login and JWT access/refresh token issuance
- Token refresh and revocation
- Password hashing (bcrypt) and reset flows
- Role-based access control authority
- Publishing Kafka events on registration and login

---

## How to Create This Service from Scratch

### Prerequisites

- Node.js 20.x
- npm 9.x or newer
- PostgreSQL running locally or via Docker

### Step 1 — Initialize the project

```bash
cd apps/auth-service
npm init -y
npm install typescript ts-node @types/node
npm install fastify @fastify/jwt @fastify/cookie dotenv
npm install bcrypt pg kafkajs
npm install @types/bcrypt @types/pg
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

### Step 4 — Create `.env` (local dev only — never commit)

```env
PORT=8081
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=arogya_auth
DB_USER=arogya
DB_PASSWORD=arogya_secret
JWT_SECRET=your-dev-secret-min-256-bits
JWT_EXPIRY=86400
REFRESH_TOKEN_EXPIRY=604800
KAFKA_BROKER=localhost:9093
KAFKA_TOPIC_USER_REGISTERED=auth.user.registered
KAFKA_TOPIC_USER_LOGGEDIN=auth.user.loggedin
```

### Step 5 — Create `src/main.ts`

- Fastify server with JWT and cookie plugins
- Register routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- Connect to PostgreSQL using `pg` client or `knex`
- Produce Kafka events on register and login
- Listen on `PORT`

### Step 6 — Build and Dockerize

```bash
npm run build
docker build -t arogya/auth-service:latest .
```

---

## Kafka Events

| Event           | Topic                  | Trigger             | Consumers            |
| --------------- | ---------------------- | ------------------- | -------------------- |
| User registered | `auth.user.registered` | POST /auth/register | notification-service |
| User logged in  | `auth.user.loggedin`   | POST /auth/login    | (audit / analytics)  |

---

## Database Ownership

- This service owns the `arogya_auth` PostgreSQL database exclusively.
- No other service reads or writes to `arogya_auth` directly.
- Other services verify user identity by validating JWTs using the shared public key.

---

## Environment Variables

| Variable                      | Required | Description                                |
| ----------------------------- | -------- | ------------------------------------------ |
| `PORT`                        | Yes      | `8081`                                     |
| `NODE_ENV`                    | Yes      | Runtime environment                        |
| `DB_HOST`                     | Yes      | `postgres` (Docker) or `localhost`         |
| `DB_PORT`                     | Yes      | `5432`                                     |
| `DB_NAME`                     | Yes      | `arogya_auth`                              |
| `DB_USER`                     | Yes      | `arogya`                                   |
| `DB_PASSWORD`                 | Yes      | Database password                          |
| `JWT_SECRET`                  | Yes      | Min 256-bit secret for token signing       |
| `JWT_EXPIRY`                  | Yes      | Access token TTL in seconds (e.g. `86400`) |
| `REFRESH_TOKEN_EXPIRY`        | Yes      | Refresh token TTL in seconds               |
| `KAFKA_BROKER`                | Yes      | `kafka:9092`                               |
| `KAFKA_TOPIC_USER_REGISTERED` | No       | `auth.user.registered`                     |
| `KAFKA_TOPIC_USER_LOGGEDIN`   | No       | `auth.user.loggedin`                       |

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

- Service name: `auth-service`
- Docker image: `arogya/auth-service:latest`
- Kubernetes service: `auth-service-svc`
- Kubernetes deployment: `auth-service-deployment`
- Namespace: `arogya`
