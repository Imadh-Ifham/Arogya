# =============================================================================
# Arogya - API Service Dockerfile Template
# Technology: Node.js 20 + TypeScript
# Port: 8080
# =============================================================================
#
# TODO: This is a template Dockerfile. Complete implementation steps before building.
#
# STEP 1 — SOURCE CODE
#   This service is the unified API gateway / BFF (Backend for Frontend).
#   Initialize in apps/api-service/:
#
#   npm init -y
#   npm install typescript ts-node @types/node
#   npm install fastify @fastify/http-proxy @fastify/jwt @fastify/rate-limit @fastify/cors
#   npm install kafkajs dotenv
#   npm install --save-dev ts-node-dev nodemon @types/node
#   npx tsc --init
#
#   Expected entry point: src/main.ts → compiled to dist/main.js
#
# STEP 2 — BUILD COMMAND
#   "build": "tsc -p tsconfig.json"
#   Output directory: dist/
#
# STEP 3 — EXPOSED PORT: 8080
#
# STEP 4 — REQUIRED ENVIRONMENT VARIABLES
#   PORT=8080
#   NODE_ENV=production
#   AUTH_SERVICE_URL=http://auth-service:8081
#   PATIENT_SERVICE_URL=http://patient-service:8082
#   DOCTOR_SERVICE_URL=http://doctor-service:8083
#   APPOINTMENT_SERVICE_URL=http://appointment-service:8084
#   PRESCRIPTION_SERVICE_URL=http://prescription-service:8085
#   TELEMEDICINE_SERVICE_URL=http://telemedicine-service:8086
#   PAYMENT_SERVICE_URL=http://payment-service:8087
#   NOTIFICATION_SERVICE_URL=http://notification-service:8088
#   AI_SERVICE_URL=http://ai-symptom-checker-service:8089
#   KAFKA_BROKER=kafka:9092
#   JWT_PUBLIC_KEY=<public-key-from-auth-service>
#
# STEP 5 — ONCE IMPLEMENTED, uncomment the Dockerfile below
# =============================================================================

# ---------- Build Stage ----------
# FROM node:20-alpine AS builder
#
# WORKDIR /app
#
# # TODO: Copy package files first for layer caching
# COPY package*.json ./
# COPY tsconfig.json ./
#
# RUN npm ci
#
# # TODO: Copy source code
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
# EXPOSE 8080
#
# CMD ["node", "dist/main.js"]
