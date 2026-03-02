# =============================================================================
# Arogya - Auth Service Dockerfile Template
# Technology: Node.js 20 + TypeScript
# Port: 8081
# =============================================================================
#
# TODO: This is a template Dockerfile. Complete implementation steps before building.
#
# STEP 1 — SOURCE CODE
#   This service owns authentication, authorization, and identity for the platform.
#   Initialize in apps/auth-service/:
#
#   npm init -y
#   npm install typescript ts-node @types/node
#   npm install fastify @fastify/jwt @fastify/cookie dotenv bcrypt
#   npm install @types/bcrypt kafkajs
#   npm install --save-dev ts-node-dev nodemon
#   npx tsc --init
#
#   Expected entry point: src/main.ts → compiled to dist/main.js
#
# STEP 2 — BUILD COMMAND
#   "build": "tsc -p tsconfig.json"
#   Output directory: dist/
#
# STEP 3 — EXPOSED PORT: 8081
#
# STEP 4 — REQUIRED ENVIRONMENT VARIABLES
#   PORT=8081
#   NODE_ENV=production
#   DB_HOST=postgres
#   DB_PORT=5432
#   DB_NAME=arogya_auth
#   DB_USER=arogya
#   DB_PASSWORD=arogya_secret
#   JWT_SECRET=<min-256-bit-secret>
#   JWT_EXPIRY=86400
#   REFRESH_TOKEN_EXPIRY=604800
#   KAFKA_BROKER=kafka:9092
#   KAFKA_TOPIC_USER_REGISTERED=auth.user.registered
#   KAFKA_TOPIC_USER_LOGGEDIN=auth.user.loggedin
#
# STEP 5 — KAFKA EVENTS PRODUCED
#   - auth.user.registered  (on new account creation)
#   - auth.user.loggedin    (on successful login)
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
# EXPOSE 8081
#
# CMD ["node", "dist/main.js"]
