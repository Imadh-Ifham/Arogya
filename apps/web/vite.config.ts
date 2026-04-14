import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward all /api/* requests to the API gateway.
      // GATEWAY_URL defaults to localhost:3000 for local dev.
      // docker-compose sets it to http://api-gateway:3000 so the
      // Vite container can reach the gateway over the Docker network.
      "/api": {
        target: process.env.GATEWAY_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

// Debug: log the proxy target on startup
console.log("🔧 Vite Proxy Config:");
console.log("   GATEWAY_URL env var:", process.env.GATEWAY_URL);
console.log("   Proxy target: /api →", process.env.GATEWAY_URL ?? "http://localhost:3000");
