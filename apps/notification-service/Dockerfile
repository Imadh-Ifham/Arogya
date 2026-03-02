# =============================================================================
# Arogya - Notification Service Dockerfile Template
# Technology: Node.js with TypeScript
# =============================================================================
#
# TODO: This is a template Dockerfile for the Notification Service.
#       Complete the implementation steps below before building.
#
# STEP 1 â€” SOURCE CODE
#   Initialize a Node.js + TypeScript project in this directory:
#
#   npm init -y
#   npm install typescript ts-node @types/node
#   npm install fastify dotenv
#   npm install kafkajs nodemailer @types/nodemailer
#   npm install --save-dev nodemon
#   npx tsc --init
#
#   Expected entry point: src/main.ts (compiled to dist/main.js)
#   This service is primarily Kafka consumer-driven (no REST API required).
#
# STEP 2 â€” BUILD COMMAND
#   Expected build script in package.json:
#   "build": "tsc -p tsconfig.json"
#   Output directory: dist/
#
# STEP 3 â€” EXPOSED PORT
#   This service must expose port: 8088
#   Set in environment: PORT=8088
#   (Used for health check endpoint only)
#
# STEP 4 â€” REQUIRED ENVIRONMENT VARIABLES
#   PORT=8088
#   KAFKA_BROKER=kafka:9092
#   KAFKA_GROUP_ID=notification-group
#   KAFKA_TOPICS=appointment.created,prescription.issued,consultation.started
#   SMTP_HOST=<smtp-server>
#   SMTP_PORT=587
#   SMTP_USER=<email>
#   SMTP_PASS=<password>
#   NODE_ENV=production
#
# STEP 5 â€” KAFKA EVENTS CONSUMED BY THIS SERVICE
#   - appointment.created   (send appointment confirmation)
#   - prescription.issued   (notify patient about new prescription)
#   - consultation.started  (notify parties about session)
#
# STEP 6 â€” ONCE IMPLEMENTED, uncomment and complete the Dockerfile below
# =============================================================================

# TODO: Uncomment and complete this Dockerfile once src/ exists

# ---------- Build Stage ----------
# FROM node:20-alpine AS builder
#
# WORKDIR /app
#
# # TODO: Copy package files first for layer caching
# COPY package*.json ./
# COPY tsconfig.json ./
#
# # TODO: Install all dependencies (including devDependencies for build)
# RUN npm ci
#
# # TODO: Copy source code
# COPY src/ ./src/
#
# # TODO: Compile TypeScript to JavaScript
# RUN npm run build

# ---------- Production Stage ----------
# FROM node:20-alpine AS runner
#
# WORKDIR /app
#
# ENV NODE_ENV=production
#
# # TODO: Copy only production dependencies manifest
# COPY package*.json ./
# RUN npm ci --omit=dev
#
# # TODO: Copy compiled output from build stage
# COPY --from=builder /app/dist ./dist
#
# # TODO: Expose health check port
# EXPOSE 8088
#
# # TODO: Set the startup command
# CMD ["node", "dist/main.js"]
