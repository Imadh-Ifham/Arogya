import { Request, Response } from "express";
import { initiatePayment } from "../services/payment.service";
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
