# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8089
CMD ["node", "dist/main.js"]
