# =============================================================================
# Arogya - AI Symptom Checker Service Dockerfile Template
# Technology: Node.js 20 + TypeScript
# Port: 8089
# =============================================================================
#
# TODO: This is a template Dockerfile. Complete implementation steps before building.
#
# STEP 1 — SOURCE CODE
#   This service receives patient symptoms and produces AI-assisted analysis.
#   It calls an external LLM/ML API and publishes results via Kafka.
#   Initialize in apps/ai-symptom-checker-service/:
#
#   npm init -y
#   npm install typescript ts-node @types/node
#   npm install fastify @fastify/jwt dotenv
#   npm install kafkajs openai axios  (or your preferred AI provider SDK)
#   npm install --save-dev ts-node-dev nodemon
#   npx tsc --init
#
#   Expected entry point: src/main.ts → compiled to dist/main.js
#
# STEP 2 — BUILD COMMAND
#   "build": "tsc -p tsconfig.json"
#   Output directory: dist/
#
# STEP 3 — EXPOSED PORT: 8089
#
# STEP 4 — REQUIRED ENVIRONMENT VARIABLES
#   PORT=8089
#   NODE_ENV=production
#   DB_HOST=mongodb
#   DB_PORT=27017
#   DB_NAME=arogya_ai
#   DB_USER=arogya
#   DB_PASSWORD=arogya_secret
#   KAFKA_BROKER=kafka:9092
#   KAFKA_TOPIC_AI_ANALYZED=ai.symptom.analyzed
#   AI_API_KEY=<openai-or-azure-openai-key>
#   AI_API_ENDPOINT=<api-endpoint>
#   AI_MODEL=gpt-4o
#
# STEP 5 — KAFKA EVENTS PRODUCED
#   - ai.symptom.analyzed  (after processing patient symptoms)
#
# STEP 5 — KAFKA EVENTS CONSUMED
#   - (optional) appointment.created  (to enrich context)
#
# STEP 6 — ONCE IMPLEMENTED, uncomment the Dockerfile below
# =============================================================================

# ---------- Build Stage ----------
# FROM node:20-alpine AS builder
#
# WORKDIR /app
#
# COPY package*.json ./
# COPY tsconfig.json ./
#
# RUN npm ci
#
# COPY src/ ./src/
#
# RUN npm run build

# ---------- Production Stage ----------
# FROM node:20-alpine AS runner
#
# WORKDIR /app
#
# ENV NODE_ENV=production
#
# COPY package*.json ./
# RUN npm ci --omit=dev
#
# COPY --from=builder /app/dist ./dist
#
# EXPOSE 8089
#
# CMD ["node", "dist/main.js"]
