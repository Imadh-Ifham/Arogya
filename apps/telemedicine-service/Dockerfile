# =============================================================================
# Arogya - Telemedicine Service Dockerfile Template
# Technology: Node.js with TypeScript
# =============================================================================
#
# TODO: This is a template Dockerfile for the Telemedicine Service.
#       Complete the implementation steps below before building.
#
# STEP 1 â€” SOURCE CODE
#   Initialize a Node.js + TypeScript project in this directory:
#
#   npm init -y
#   npm install typescript ts-node @types/node
#   npm install fastify @fastify/websocket ws @types/ws
#   npm install kafkajs dotenv uuid
#   npm install --save-dev @types/uuid nodemon
#   npx tsc --init
#
#   Expected entry point: src/main.ts (compiled to dist/main.js)
#
# STEP 2 â€” BUILD COMMAND
#   Expected build script in package.json:
#   "build": "tsc -p tsconfig.json"
#   Output directory: dist/
#
# STEP 3 â€” EXPOSED PORT
#   This service must expose port: 8086
#   Set in environment: PORT=8086
#   WebSocket endpoint will be available on the same port.
#
# STEP 4 â€” REQUIRED ENVIRONMENT VARIABLES
#   PORT=8086
#   KAFKA_BROKER=kafka:9092
#   KAFKA_TOPIC_CONSULTATION_STARTED=consultation.started
#   KAFKA_GROUP_ID=telemedicine-group
#   NODE_ENV=production
#   MONGO_URI=mongodb://mongodb:27017/arogya_telemedicine
#
# STEP 5 â€” KAFKA EVENTS PRODUCED BY THIS SERVICE
#   - consultation.started  (when a video/audio session begins)
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
# # TODO: Expose the service port (also used for WebSocket)
# EXPOSE 8086
#
# # TODO: Set the startup command
# CMD ["node", "dist/main.js"]
