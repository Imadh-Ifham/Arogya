import "dotenv/config";
import { validateEnv } from "./config/env";
import { connectDatabase } from "./config/database";
import { symptomRoutes } from "./routes/symptom.routes";

// Crash fast on missing env vars — must be first
validateEnv();

import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import mongoose from "mongoose";

const PORT = parseInt(process.env.PORT as string, 10);
const JWT_SECRET = process.env.JWT_SECRET as string;

async function buildServer() {
  const fastify = Fastify({ logger: true });

  // Register JWT plugin
  await fastify.register(fastifyJwt, { secret: JWT_SECRET });

  // Reusable authenticate preHandler
  async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      await request.jwtVerify();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[auth] jwtVerify failed:", msg);
      return reply.code(401).send({ error: "Unauthorized" });
    }
  }

  // Health check (unauthenticated)
  fastify.get("/health", async (_request, _reply) => {
    return {
      status: "ok",
      service: "ai-symptom-checker-service",
      timestamp: new Date().toISOString(),
    };
  });

  // Register symptom routes under /ai prefix
  await fastify.register(
    async (instance) => {
      await symptomRoutes(instance, { authenticate });
    },
    { prefix: "/ai" }
  );

  return fastify;
}

async function main(): Promise<void> {
  // Connect to MongoDB
  await connectDatabase();

  const fastify = await buildServer();

  // Graceful shutdown
  async function shutdown(signal: string): Promise<void> {
    fastify.log.info(`[main] Received ${signal} — shutting down gracefully`);
    try {
      await fastify.close();
      await mongoose.disconnect();
      fastify.log.info("[main] Server and database connections closed");
      process.exit(0);
    } catch (err) {
      fastify.log.error({ err }, "[main] Error during shutdown");
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT",  () => { void shutdown("SIGINT"); });

  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

void main();
