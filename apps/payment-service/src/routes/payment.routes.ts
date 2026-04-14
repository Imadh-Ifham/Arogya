import { Router } from "express";
import express from "express";
import {
  initiatePaymentController,
  webhookController,
  devSimulateController,
} from "../controllers/payment.controller";
import { env } from "../config/env";

const router = Router();

// ─── POST /api/payments/initiate ──────────────────────────────────────────────
// Called internally by appointment-service (no auth middleware needed —
// this is a service-to-service call within the Docker network).
router.post("/initiate", initiatePaymentController);

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Called by Stripe directly. Uses raw body parser for signature verification.
// The JSON body parser is SKIPPED for this route (handled in main.ts).
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookController,
);

// ─── DEV ONLY: Simulate payment success ───────────────────────────────────────
// POST /api/payments/dev/simulate-success/:paymentId
// Manually marks a PENDING payment as SUCCESS (no Stripe needed).
if (env.nodeEnv === "development") {
  router.post("/dev/simulate-success/:paymentId", devSimulateController);
}

// TODO: Phase 5 — GET /api/payments/me, GET /api/payments/doctor/me, GET /api/payments/:id

export default router;
