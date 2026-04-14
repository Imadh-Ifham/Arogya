import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "./config/env"; // loads + validates env vars before anything else
import notificationRoutes from "./routes/notification.routes";
import templateRoutes from "./routes/template.routes";
import { NotificationError } from "./services/template.service";

const app = express();

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Internal services call this directly over Docker bridge network.
// The API Gateway also proxies admin traffic here, so we allow its origin.
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://api-gateway:3000",
      "http://web:5173",
      "*",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Notification sends are intentionally throttled — Twilio/SendGrid charge per
// message and have their own rate limits. This prevents accidental flood loops.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const sendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 sends/minute — generous for inter-service calls
  message: { success: false, message: "Too many notification requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} → ${_res.statusCode} (${Date.now() - start}ms)`,
    );
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// Mount templates first (more specific) so /templates/* is not swallowed
// by the broader /api/notifications/* prefix below.
// /api/notifications/templates  — template CRUD
// /api/notifications/send       — dispatch endpoint (rate-limited)
// /api/notifications/logs       — audit log
app.use("/api/notifications/templates", templateRoutes);
app.use("/api/notifications/send", sendLimiter);
app.use("/api/notifications", notificationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: "notification-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${err.name}: ${err.message}`);

  if (err instanceof NotificationError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if ((err as any).code === 11000) {
    res.status(409).json({ success: false, message: "Duplicate record" });
    return;
  }

  if (err.name === "ValidationError") {
    res.status(422).json({ success: false, message: err.message });
    return;
  }

  if (err.name === "CastError") {
    res.status(400).json({ success: false, message: "Invalid ID format" });
    return;
  }

  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
