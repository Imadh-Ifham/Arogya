# ── Stage 1: Build ──────────────────────────────────────────────────────────
# Compile TypeScript → JavaScript.
# Using a build stage means the final image contains no TypeScript compiler,
# no source maps, and no devDependencies — keeping it lean.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker layer-caches npm install separately from src.
# A source-only change skips npm install on the next build.
COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --only=production=false

COPY server.ts ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JS from builder — no source, no compiler
COPY --from=builder /app/dist ./dist

# Never run as root in a container
USER node

EXPOSE 3002

CMD ["node", "dist/server.js"]
