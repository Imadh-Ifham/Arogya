import { buildApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";

async function start(): Promise<void> {
  await connectDatabase();

  const app = buildApp();

  const server = app.listen(env.port, "0.0.0.0", () => {
    logger.info(`${env.serviceName} listening on port ${env.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

start().catch((error: unknown) => {
  logger.error({ err: error }, "Service failed to start");
  process.exit(1);
});
