import { Request, Response } from "express";
import {
  initiatePayment,
  handleWebhook,
  devSimulateSuccess,
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
