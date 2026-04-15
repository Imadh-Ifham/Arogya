import { Request, Response } from "express";
import {
  initiatePayment,
  handleWebhook,
  devSimulateSuccess,
  getPatientPayments,
  getDoctorPayments,
  getPaymentById,
  adminListPayments,
  adminPaymentMetrics,
} from "../services/payment.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { InitiatePaymentBody } from "../types/payment.types";

/**
 * POST /api/payments/initiate
 *
 * Called by appointment-service when the doctor accepts an appointment.
 * Creates a Stripe Checkout Session and returns the paymentId + checkoutUrl.
 */
export const initiatePaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { appointmentId, amount, patientId, doctorId, currency } =
      req.body as InitiatePaymentBody;

    // ─── Validation ──────────────────────────────────────────────────────────
    if (!appointmentId || !patientId || !doctorId) {
      sendError(
        res,
        "appointmentId, patientId, and doctorId are required",
        400,
      );
      return;
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      sendError(res, "amount must be a positive number", 400);
      return;
    }

    // ─── Initiate ────────────────────────────────────────────────────────────
    const result = await initiatePayment({
      appointmentId,
      amount,
      patientId,
      doctorId,
      currency,
    });

    sendSuccess(res, result, "Payment initiated", 201);
  } catch (error) {
    console.error("[Controller] initiatePayment error:", error);
    sendError(res, "Failed to initiate payment");
  }
};

/**
 * POST /api/payments/webhook
 *
 * Called by Stripe directly (NOT through API Gateway).
 * Receives raw body for HMAC signature verification.
 * Updates payment status to SUCCESS or FAILED.
 */
export const webhookController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      sendError(res, "Missing stripe-signature header", 400);
      return;
    }

    const result = await handleWebhook(req.body as Buffer, signature);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    console.error("[Controller] webhook error:", message);
    sendError(res, message, 400);
  }
};

/**
 * POST /api/payments/dev/simulate-success/:paymentId
 *
 * DEV ONLY — manually marks a payment as SUCCESS + generates receipt.
 * Useful for testing when you don't want to open the Stripe checkout page.
 */
export const devSimulateController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const paymentId = req.params.paymentId as string;
    const result = await devSimulateSuccess(paymentId);
    sendSuccess(res, result, "Payment simulated as SUCCESS");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation error";
    console.error("[Controller] devSimulate error:", message);
    sendError(res, message, 400);
  }
};

/**
 * GET /api/payments/me
 *
 * Patient payment history — paginated, filterable by status.
 * Reads patientId from x-user-id header (injected by API Gateway).
 */
export const getMyPaymentsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.headers["x-user-id"] as string;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await getPatientPayments(patientId, { status, page, limit });
    sendSuccess(res, result, "Payment history retrieved");
  } catch (error) {
    console.error("[Controller] getMyPayments error:", error);
    sendError(res, "Failed to retrieve payment history");
  }
};

/**
 * GET /api/payments/doctor/me
 *
 * Doctor payment dashboard — paginated, filterable, with summary.
 * Reads doctorId from x-user-id header (injected by API Gateway).
 */
export const getDoctorPaymentsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.headers["x-user-id"] as string;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await getDoctorPayments(doctorId, { status, page, limit });
    sendSuccess(res, result, "Payment dashboard retrieved");
  } catch (error) {
    console.error("[Controller] getDoctorPayments error:", error);
    sendError(res, "Failed to retrieve payment dashboard");
  }
};

/**
 * GET /api/payments/admin/all
 *
 * Admin: list all payments with optional filters.
 * Query params: status, patientId, doctorId, from (YYYY-MM-DD), to, page, limit
 */
export const adminListPaymentsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const status    = req.query.status    as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    const doctorId  = req.query.doctorId  as string | undefined;
    const from      = req.query.from      as string | undefined;
    const to        = req.query.to        as string | undefined;
    const page      = parseInt(req.query.page  as string) || 1;
    const limit     = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await adminListPayments({ status, patientId, doctorId, from, to, page, limit });
    sendSuccess(res, result, "Payments retrieved");
  } catch (error) {
    console.error("[Controller] adminListPayments error:", error);
    sendError(res, "Failed to retrieve payments");
  }
};

/**
 * GET /api/payments/admin/metrics
 *
 * Admin: financial summary — totals and revenue by time window.
 */
export const adminPaymentMetricsController = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await adminPaymentMetrics();
    sendSuccess(res, result, "Financial metrics retrieved");
  } catch (error) {
    console.error("[Controller] adminPaymentMetrics error:", error);
    sendError(res, "Failed to retrieve financial metrics");
  }
};

/**
 * GET /api/payments/:id
 *
 * Single payment details / receipt.
 * Accessible by the patient who owns it, the doctor on the appointment, or an admin.
 */
export const getPaymentByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const paymentId = req.params.id as string;
    const userId = req.headers["x-user-id"] as string;
    const userRole = req.headers["x-user-role"] as string;

    const payment = await getPaymentById(paymentId);

    if (!payment) {
      sendError(res, "Payment not found", 404);
      return;
    }

    // Authorization: patient, doctor on this appointment, or admin
    const isOwner = payment.patientId === userId;
    const isDoctor = payment.doctorId === userId;
    const isAdmin = userRole === "admin";

    if (!isOwner && !isDoctor && !isAdmin) {
      sendError(res, "Not authorized to view this payment", 403);
      return;
    }

    sendSuccess(res, payment, "Payment details retrieved");
  } catch (error) {
    console.error("[Controller] getPaymentById error:", error);
    sendError(res, "Failed to retrieve payment details");
  }
};
