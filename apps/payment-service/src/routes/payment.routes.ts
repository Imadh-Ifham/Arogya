import { Router } from "express";
import { initiatePaymentController } from "../controllers/payment.controller";

const router = Router();

// ─── POST /api/payments/initiate ──────────────────────────────────────────────
// Called internally by appointment-service (no auth middleware needed —
// this is a service-to-service call within the Docker network).
router.post("/initiate", initiatePaymentController);

// TODO: Phase 4 — POST /api/payments/webhook (Stripe webhook)
// TODO: Phase 5 — GET /api/payments/me, GET /api/payments/doctor/me, GET /api/payments/:id

export default router;
