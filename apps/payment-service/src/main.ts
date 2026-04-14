import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "./config/env";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import paymentRoutes from "./routes/payment.routes";

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://api-gateway:3000",
      "*",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// JSON for all routes EXCEPT /api/payments/webhook (needs raw body for Stripe)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    next();
  } else {
    express.json({ limit: "10kb" })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Request logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ success: true, service: "payment-service", status: "healthy" });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/payments", paymentRoutes);

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(`[Server] Payment Service running on port ${env.port}`);
      console.log(`[Server] Environment: ${env.nodeEnv}`);
      console.log(`[Server] Health check: http://localhost:${env.port}/health`);
    });

    const shutdown = (signal: string) => {
      console.log(`[Server] ${signal} received — shutting down gracefully`);
      server.close(() => {
        console.log("[Server] HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
};

startServer();
