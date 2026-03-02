# =============================================================================
# Arogya - Payment Service Dockerfile Template
# Technology: Node.js 20 + TypeScript
# Port: 8087
# =============================================================================
#
# TODO: This is a template Dockerfile. Complete implementation steps before building.
#
# STEP 1 — SOURCE CODE
#   This service handles payment processing, billing, and transaction records.
#   Initialize in apps/payment-service/:
#
#   npm init -y
#   npm install typescript ts-node @types/node
#   npm install fastify @fastify/jwt dotenv
#   npm install kafkajs stripe  (or razorpay for Indian market)
#   npm install @types/stripe
#   npm install --save-dev ts-node-dev nodemon
#   npx tsc --init
#
#   Expected entry point: src/main.ts → compiled to dist/main.js
#
# STEP 2 — BUILD COMMAND
#   "build": "tsc -p tsconfig.json"
#   Output directory: dist/
#
# STEP 3 — EXPOSED PORT: 8087
#
# STEP 4 — REQUIRED ENVIRONMENT VARIABLES
#   PORT=8087
#   NODE_ENV=production
#   DB_HOST=postgres
#   DB_PORT=5432
#   DB_NAME=arogya_payments
#   DB_USER=arogya
#   DB_PASSWORD=arogya_secret
#   KAFKA_BROKER=kafka:9092
#   KAFKA_TOPIC_PAYMENT_COMPLETED=payment.completed
#   PAYMENT_GATEWAY_KEY=<your-gateway-api-key>
#   PAYMENT_GATEWAY_SECRET=<your-gateway-secret>
#   WEBHOOK_SECRET=<payment-webhook-secret>
#
# STEP 5 — KAFKA EVENTS PRODUCED
#   - payment.completed  (on successful transaction)
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
# EXPOSE 8087
#
# CMD ["node", "dist/main.js"]
