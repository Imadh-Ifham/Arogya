import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "./config/env"; // must be first line — loads + validates env vars
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import { AuthError } from "./services/auth.service";

const app = express();

// ─── Core middleware ───────────────────────────────────────────────────────────

// Parse incoming JSON bodies — without this, req.body is always undefined
app.use(express.json({ limit: "10kb" }));
// 10kb limit prevents someone sending a 50MB JSON body to crash your service
// (a simple but effective DoS prevention measure)

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS controls which origins (domains) are allowed to call this service.
// In microservices, only the API Gateway should call Auth directly.
// Other services call each other internally and don't need CORS headers.
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",      // API Gateway (local dev)
      "http://localhost:5173",      // Vite frontend (local dev)
      "http://api-gateway:3000",    // API Gateway (Docker)
      "http://web:5173",            // Vite frontend (Docker)
      "*",                          // Allow all origins (development only!)
    ],
    credentials: true, // allows cookies to be sent cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Rate limiting ─────────────────────────────────────────────────────────────
// General limiter — applies to all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP per window
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true, // sends RateLimit-* headers so clients know their limit
  legacyHeaders: false,
});

// Strict limiter for auth endpoints — brute force protection
// A real attacker trying passwords needs thousands of attempts.
// 10 attempts per 15 minutes makes brute force computationally infeasible.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again in 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── Request logging ───────────────────────────────────────────────────────────
// Simple logger — in production you'd replace this with Winston or Pino,
// but this is sufficient for development and assignment purposes
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} → ${_res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/auth/admin", adminRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
// Catches any request that didn't match a route above
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ─── Global error handler ──────────────────────────────────────────────────────
// Express identifies this as the error handler because it has FOUR parameters.
// Any time a controller calls next(error), it lands here.
// This is the single place in the entire app that converts errors to HTTP responses.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${err.name}: ${err.message}`);

  // AuthError is our custom error class from auth.service.ts
  // It carries a statusCode we set deliberately (401, 404, 409 etc.)
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Mongoose duplicate key error (e.g. email already exists)
  // Code 11000 is MongoDB's error code for unique constraint violations
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      message: "A record with this information already exists",
    });
    return;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: err.message,
    });
    return;
  }

  // JWT errors — these happen when someone sends a tampered or expired token
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Token expired",
    });
    return;
  }

  // Anything else is an unexpected server error — don't leak internal details
  // In production, log this to a monitoring service (Sentry, Datadog etc.)
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;
