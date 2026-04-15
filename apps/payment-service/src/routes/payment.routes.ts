import { Router } from "express";
import express from "express";
import {
  initiatePaymentController,
  webhookController,
  devSimulateController,
  getMyPaymentsController,
  getDoctorPaymentsController,
  getPaymentByIdController,
  adminListPaymentsController,
  adminPaymentMetricsController,
} from "../controllers/payment.controller";
import { requireUser, requireRole } from "../middleware/auth.middleware";
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

// ─── GET /api/payments/me ──────────────────────────────────────────────────────
// Patient payment history (paginated, filterable by status).
// Requires x-user-id header from API Gateway.
router.get("/me", requireUser, getMyPaymentsController);

// ─── GET /api/payments/doctor/me ──────────────────────────────────────────────
// Doctor payment dashboard with summary aggregation.
// Requires doctor or admin role.
router.get(
  "/doctor/me",
  requireUser,
  requireRole("doctor", "admin"),
  getDoctorPaymentsController,
);

// ─── GET /api/payments/admin/all ─────────────────────────────────────────────
// Admin: list all payments across the platform (paginated, filterable).
router.get(
  "/admin/all",
  requireUser,
  requireRole("admin"),
  adminListPaymentsController,
);

// ─── GET /api/payments/admin/metrics ─────────────────────────────────────────
// Admin: financial summary — totals, revenue by period.
router.get(
  "/admin/metrics",
  requireUser,
  requireRole("admin"),
  adminPaymentMetricsController,
);

// ─── GET /api/payments/:id ────────────────────────────────────────────────────
// Single payment details / receipt. Accessible by patient, doctor, or admin.
// MUST be after /me and /doctor/me to avoid matching "me" as :id.
router.get("/:id", requireUser, getPaymentByIdController);

export default router;
