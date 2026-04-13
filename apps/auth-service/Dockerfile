# ── Stage 1: Build ──────────────────────────────────────────────────────────
# We use a multi-stage build — the build stage compiles TypeScript,
# the production stage runs only the compiled JS with no dev dependencies.
# This keeps the final image small and free of build tools.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first — Docker caches this layer.
# If only your source code changes (not dependencies), Docker skips
# npm install on rebuild — dramatically faster builds.
COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --only=production=false

COPY src/ ./src/

RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only copy what production actually needs — no TypeScript compiler, no tests
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JS from builder stage
COPY --from=builder /app/dist ./dist

# Never run as root inside a container — security best practice
USER node

EXPOSE 3001

# Use the compiled JS entry point
CMD ["node", "dist/server.js"]
