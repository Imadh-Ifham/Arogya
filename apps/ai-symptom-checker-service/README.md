# AI Symptom Checker Service

## Overview

The AI Symptom Checker Service accepts patient-described symptoms and produces AI-powered preliminary analysis and triage suggestions. It integrates with an external LLM/ML provider (e.g., OpenAI, Azure OpenAI) and publishes results as Kafka events for consumption by other services.

**Technology:** Node.js 20 + TypeScript  
**Port:** `8089`  
**Domain:** AI / Clinical Decision Support  
**Database:** MongoDB (`arogya_ai`) — stores analysis sessions and results  
**Status:** Not yet implemented — placeholder directory only

---

## Responsibilities

- Accept symptom descriptions from authenticated patients (via api-service)
- Call external AI/LLM API with structured patient context
- Store analysis sessions and results in MongoDB
- Publish `ai.symptom.analyzed` Kafka event with triage summary
- Provide analysis history per patient

---

## How to Create This Service from Scratch

### Prerequisites

- Node.js 20.x
- npm 9.x or newer
- MongoDB running locally or via Docker
- An AI API key (OpenAI / Azure OpenAI / compatible)

### Step 1 — Initialize the project

```bash
cd apps/ai-symptom-checker-service
npm init -y
npm install typescript ts-node @types/node
npm install fastify @fastify/jwt dotenv
npm install kafkajs mongoose openai
npm install --save-dev ts-node-dev nodemon
npx tsc --init
```

> Replace `openai` with your chosen AI provider SDK if different.

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
PORT=8089
NODE_ENV=development
MONGO_URI=mongodb://arogya:arogya_secret@localhost:27017/arogya_ai?authSource=admin
KAFKA_BROKER=localhost:9093
KAFKA_TOPIC_AI_ANALYZED=ai.symptom.analyzed
AI_API_KEY=your-openai-api-key
AI_API_ENDPOINT=https://api.openai.com/v1
AI_MODEL=gpt-4o
```

### Step 5 — Create `src/main.ts`

- Fastify server with JWT verification
- Register routes: `POST /ai/analyze`, `GET /ai/history/:patientId`
- Connect to MongoDB via Mongoose
- Call the AI API with structured symptom input
- Store session and result in MongoDB
- Produce `ai.symptom.analyzed` Kafka event with triage summary
- Listen on `PORT`

### Step 6 — Build and Dockerize

```bash
npm run build
docker build -t arogya/ai-symptom-checker-service:latest .
```

---

## Kafka Events

| Event                 | Topic                 | Trigger            | Consumers                                 |
| --------------------- | --------------------- | ------------------ | ----------------------------------------- |
| Symptom analysis done | `ai.symptom.analyzed` | Successful AI call | notification-service, appointment-service |

---

## Database Ownership

- This service owns `arogya_ai` in MongoDB exclusively.
- Analysis sessions and results are stored as documents.
- No other service reads from this database directly.

---

## Environment Variables

| Variable                  | Required | Description                                                               |
| ------------------------- | -------- | ------------------------------------------------------------------------- |
| `PORT`                    | Yes      | `8089`                                                                    |
| `NODE_ENV`                | Yes      | Runtime environment                                                       |
| `MONGO_URI`               | Yes      | `mongodb://arogya:arogya_secret@mongodb:27017/arogya_ai?authSource=admin` |
| `KAFKA_BROKER`            | Yes      | `kafka:9092`                                                              |
| `KAFKA_TOPIC_AI_ANALYZED` | No       | `ai.symptom.analyzed`                                                     |
| `AI_API_KEY`              | Yes      | External AI provider API key                                              |
| `AI_API_ENDPOINT`         | Yes      | AI provider base URL                                                      |
| `AI_MODEL`                | Yes      | Model identifier (e.g., `gpt-4o`)                                         |

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

- Service name: `ai-symptom-checker-service`
- Docker image: `arogya/ai-symptom-checker-service:latest`
- Kubernetes service: `ai-symptom-checker-service-svc`
- Namespace: `arogya`
