# =============================================================================
# Arogya — Web Frontend (production image)
# Build: Vite
# Runtime: nginx (unprivileged)
# Port: 8080
# =============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

ENV VITE_TELEMEDICINE_API_URL=/api/v1
ENV VITE_TELEMEDICINE_WS_URL=

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
