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

RUN npm ci --include=dev

COPY server.ts ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only copy what production actually needs — no TypeScript compiler, no tests
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS from builder stage
COPY --from=builder /app/dist ./dist

# Never run as root inside a container — security best practice
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://localhost:8081/api/auth/health >/dev/null || exit 1

EXPOSE 8081

# Use the compiled JS entry point
CMD ["node", "dist/server.js"]
