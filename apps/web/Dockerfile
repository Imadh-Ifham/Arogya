# =============================================================================
# Arogya — Web Frontend (Vite dev server)
# Intended for development / testing only.
# For production, build with `npm run build` and serve dist/ with nginx.
# Port: 5173
# =============================================================================

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# --host exposes Vite outside the container
# GATEWAY_URL is read by vite.config.ts to set the proxy target
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
