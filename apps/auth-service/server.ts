/// <reference path="./src/types/express.d.ts" />
import app from "./src/app";
import { connectDatabase } from "./src/config/database";
import { env } from "./src/config/env";

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB first — if this fails, we don't start accepting requests
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(`[Server] Auth Service running on port ${env.port}`);
      console.log(`[Server] Environment: ${env.nodeEnv}`);
      console.log(
        `[Server] Health check: http://localhost:${env.port}/api/auth/health`,
      );
    });

    // Graceful shutdown handler
    // When Docker/Kubernetes stops the container (SIGTERM), we:
    // 1. Stop accepting new requests immediately
    // 2. Wait for in-flight requests to complete
    // 3. Close the DB connection cleanly
    // Without this, active requests get cut off mid-response
    const shutdown = (signal: string) => {
      console.log(`[Server] ${signal} received — shutting down gracefully`);
      server.close(() => {
        console.log("[Server] HTTP server closed");
        process.exit(0);
      });

      // Force shutdown after 10s if requests don't finish
      setTimeout(() => {
        console.error("[Server] Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
};

startServer();
