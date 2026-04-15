import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import axios from "axios";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { Payment } from "../models/payment.model";
import { PaymentEvent } from "../models/paymentEvent.model";
import {
  InitiatePaymentBody,
  InitiatePaymentResponse,
} from "../types/payment.types";
import { generateReceiptNumber } from "../utils/receipt";

// ─── Appointment-service callback helpers ────────────────────────────────────

/**
 * Notifies appointment-service that payment succeeded.
 * Called inside the Stripe webhook handler after the payment is marked SUCCESS.
 * Fire-and-forget — failures are logged but never re-thrown (Stripe must get 200).
 */
const notifyAppointmentConfirmed = async (
  appointmentId: string,
  paymentId: string,
): Promise<void> => {
  const url = `${env.appointmentServiceUrl}/api/appointments/${appointmentId}/payment-confirmed`;
  try {
    await axios.post(url, { paymentId }, { timeout: 5000 });
    console.log(
      `[Payment] Notified appointment-service: appointment ${appointmentId} confirmed`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Payment] Failed to notify appointment-service for appointment ${appointmentId}: ${message}`,
    );
  }
};

/**
 * Notifies appointment-service that payment failed or expired.
 * Appointment is rolled back to PENDING so the patient can retry.
 */
const notifyAppointmentPaymentFailed = async (
  appointmentId: string,
): Promise<void> => {
  const url = `${env.appointmentServiceUrl}/api/appointments/${appointmentId}/payment-failed`;
  try {
    await axios.post(url, {}, { timeout: 5000 });
    console.log(
      `[Payment] Notified appointment-service: payment failed for appointment ${appointmentId}`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Payment] Failed to notify appointment-service (payment-failed) for ${appointmentId}: ${message}`,
    );
  }
};

/**
 * Creates a Stripe Checkout Session and saves a PENDING payment record.
 *
 * Flow:
 *  1. Check if payment already exists for this appointment (idempotency)
 *  2. Generate a unique paymentId
 *  3. Create Stripe Checkout Session with consultation fee details
 *  4. Save payment document as PENDING
 *  5. Log INITIATED event for audit trail
 *  6. Return paymentId + checkoutUrl to appointment-service
 */
export const initiatePayment = async (
  body: InitiatePaymentBody,
): Promise<InitiatePaymentResponse> => {
  const { appointmentId, amount, patientId, doctorId, currency = "LKR" } = body;

  // ─── 1. Idempotency check ──────────────────────────────────────────────────
  // If doctor re-accepts the same appointment, don't create a duplicate payment.
  const existing = await Payment.findOne({ appointmentId });
  if (existing) {
    return {
      paymentId: existing.paymentId,
      checkoutUrl: existing.checkoutUrl,
      status: "PENDING",
      amount: existing.amount,
      currency: existing.currency,
    };
  }

  // ─── 2. Generate paymentId ─────────────────────────────────────────────────
  const paymentId = `pay_${uuidv4()}`;

  // ─── 3. Create Stripe Checkout Session ─────────────────────────────────────
  // Stripe expects amounts in the smallest currency unit (cents/paisa).
  // For LKR, 1 LKR = 100 cents → multiply by 100.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(amount * 100), // convert to smallest unit
          product_data: {
            name: "Consultation Fee",
            description: `Appointment ${appointmentId}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentId,
      appointmentId,
      patientId,
      doctorId,
    },
    success_url: `${env.frontendUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/payments/cancel?session_id={CHECKOUT_SESSION_ID}`,
  });

  // ─── 4. Save payment record ────────────────────────────────────────────────
  const payment = await Payment.create({
    paymentId,
    appointmentId,
    patientId,
    doctorId,
    amount,
    currency,
    status: "PENDING",
    gateway: "stripe",
    stripeSessionId: session.id,
    checkoutUrl: session.url!,
  });

  // ─── 5. Audit log ─────────────────────────────────────────────────────────
  await PaymentEvent.create({
    paymentId,
    type: "INITIATED",
    payload: {
      appointmentId,
      amount,
      currency,
      stripeSessionId: session.id,
    },
  });

  console.log(
    `[Payment] Initiated: ${paymentId} for appointment ${appointmentId} (${currency} ${amount})`,
  );

  // ─── 6. Return to appointment-service ──────────────────────────────────────
  return {
    paymentId: payment.paymentId,
    checkoutUrl: payment.checkoutUrl,
    status: "PENDING",
    amount: payment.amount,
    currency: payment.currency,
  };
};

// =============================================================================
// WEBHOOK HANDLING
// =============================================================================

/**
 * Verifies and processes Stripe webhook events.
 *
 * Handles:
 *  - checkout.session.completed → mark SUCCESS, generate receipt
 *  - checkout.session.expired   → mark FAILED
 *
 * Idempotent: if payment is already SUCCESS, returns 200 without changes.
 * Stripe retries webhooks if it doesn't get 200, so we always return 200
 * for events we recognize (even if the payment is missing — just log a warning).
 */
export const handleWebhook = async (
  rawBody: Buffer,
  signature: string,
): Promise<{ received: boolean }> => {
  // ─── 1. Verify signature ──────────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripe.webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Webhook signature verification failed: ${message}`);
  }

  // ─── 2. Log raw event ─────────────────────────────────────────────────────
  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  // ─── 3. Route by event type ───────────────────────────────────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutFailed(session, "EXPIRED");
      break;
    }
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  return { received: true };
};

/**
 * checkout.session.completed → Payment SUCCESS + receipt generation.
 */
const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const payment = await Payment.findOne({ stripeSessionId: session.id });

  if (!payment) {
    console.warn(
      `[Webhook] No payment found for session ${session.id} — ignoring`,
    );
    return;
  }

  // Idempotent: already processed
  if (payment.status === "SUCCESS") {
    console.log(
      `[Webhook] Payment ${payment.paymentId} already SUCCESS — skipping`,
    );
    return;
  }

  // Generate receipt
  const receipt = {
    receiptNumber: generateReceiptNumber(),
    paidAt: new Date(),
    gatewayReference:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || "unknown",
    method: session.payment_method_types?.[0] || "card",
  };

  // Update payment
  payment.status = "SUCCESS";
  payment.receipt = receipt;
  await payment.save();

  // Audit log
  await PaymentEvent.create({
    paymentId: payment.paymentId,
    type: "SUCCESS",
    payload: {
      stripeSessionId: session.id,
      paymentIntent: receipt.gatewayReference,
      receiptNumber: receipt.receiptNumber,
    },
  });

  console.log(
    `[Payment] SUCCESS: ${payment.paymentId} | Receipt: ${receipt.receiptNumber}`,
  );

  // Notify appointment-service so it can transition status to PAYMENT_COMPLETED
  // and send confirmation notifications to patient + doctor.
  if (payment.appointmentId) {
    await notifyAppointmentConfirmed(payment.appointmentId, payment.paymentId);
  }
};

/**
 * checkout.session.expired or payment failure → Payment FAILED.
 */
const handleCheckoutFailed = async (
  session: Stripe.Checkout.Session,
  reason: string,
): Promise<void> => {
  const payment = await Payment.findOne({ stripeSessionId: session.id });

  if (!payment) {
    console.warn(
      `[Webhook] No payment found for session ${session.id} — ignoring`,
    );
    return;
  }

  // Don't revert a successful payment
  if (payment.status === "SUCCESS") {
    console.log(
      `[Webhook] Payment ${payment.paymentId} already SUCCESS — not marking FAILED`,
    );
    return;
  }

  payment.status = "FAILED";
  await payment.save();

  await PaymentEvent.create({
    paymentId: payment.paymentId,
    type: "FAILED",
    payload: { stripeSessionId: session.id, reason },
  });

  console.log(`[Payment] FAILED: ${payment.paymentId} (${reason})`);

  // Notify appointment-service to roll back to PENDING so patient can retry
  if (payment.appointmentId) {
    await notifyAppointmentPaymentFailed(payment.appointmentId);
  }
};

// =============================================================================
// DEV-ONLY: Simulate webhook (for testing without Stripe CLI)
// =============================================================================

/**
 * Manually marks a payment as SUCCESS. Only available in development.
 * Useful for quick testing when Stripe CLI isn't running.
 */
export const devSimulateSuccess = async (
  paymentId: string,
): Promise<{ paymentId: string; status: string; receipt: unknown }> => {
  if (env.nodeEnv !== "development") {
    throw new Error("Dev simulate is only available in development mode");
  }

  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  if (payment.status === "SUCCESS") {
    return {
      paymentId: payment.paymentId,
      status: payment.status,
      receipt: payment.receipt,
    };
  }

  const receipt = {
    receiptNumber: generateReceiptNumber(),
    paidAt: new Date(),
    gatewayReference: "dev_simulated",
    method: "card",
  };

  payment.status = "SUCCESS";
  payment.receipt = receipt;
  await payment.save();

  await PaymentEvent.create({
    paymentId: payment.paymentId,
    type: "SUCCESS",
    payload: { simulated: true },
  });

  console.log(
    `[Payment] DEV SIMULATED SUCCESS: ${payment.paymentId} | Receipt: ${receipt.receiptNumber}`,
  );

  // Notify appointment-service (same as real webhook flow)
  if (payment.appointmentId) {
    await notifyAppointmentConfirmed(payment.appointmentId, payment.paymentId);
  }

  return {
    paymentId: payment.paymentId,
    status: payment.status,
    receipt: payment.receipt,
  };
};

// =============================================================================
// PAYMENT HISTORY + SINGLE PAYMENT
// =============================================================================

/**
 * Patient payment history — paginated, filterable by status.
 * Used by GET /api/payments/me
 */
export const getPatientPayments = async (
  patientId: string,
  options: { status?: string; page?: number; limit?: number },
) => {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { patientId };
  if (status && ["PENDING", "SUCCESS", "FAILED"].includes(status)) {
    filter.status = status;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);

  return { payments, total, page, limit };
};

/**
 * Doctor payment dashboard — paginated, filterable, with summary aggregation.
 * Used by GET /api/payments/doctor/me
 */
export const getDoctorPayments = async (
  doctorId: string,
  options: { status?: string; page?: number; limit?: number },
) => {
  const { status, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { doctorId };
  if (status && ["PENDING", "SUCCESS", "FAILED"].includes(status)) {
    filter.status = status;
  }

  // Run paginated query and summary aggregation in parallel
  const [payments, total, summaryResult] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: { doctorId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  // Build summary from aggregation
  const summary = {
    totalPending: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalReceived: 0,
  };

  for (const entry of summaryResult) {
    switch (entry._id) {
      case "PENDING":
        summary.totalPending = entry.count;
        break;
      case "SUCCESS":
        summary.totalSuccess = entry.count;
        summary.totalReceived = entry.totalAmount;
        break;
      case "FAILED":
        summary.totalFailed = entry.count;
        break;
    }
  }

  return { payments, total, page, limit, summary };
};

/**
 * Single payment by paymentId.
 * Used by GET /api/payments/:id
 */
export const getPaymentById = async (paymentId: string) => {
  return Payment.findOne({ paymentId }).lean();
};

// =============================================================================
// ADMIN: All payments + financial metrics
// =============================================================================

export interface AdminPaymentsOptions {
  status?: string;
  patientId?: string;
  doctorId?: string;
  from?: string;   // ISO date string YYYY-MM-DD
  to?: string;
  page?: number;
  limit?: number;
}

/**
 * Admin: list all payments with optional filtering and pagination.
 */
export const adminListPayments = async (opts: AdminPaymentsOptions) => {
  const { status, patientId, doctorId, from, to, page = 1, limit = 20 } = opts;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (status && ["PENDING", "SUCCESS", "FAILED"].includes(status)) filter.status = status;
  if (patientId) filter.patientId = patientId;
  if (doctorId) filter.doctorId = doctorId;
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }
    filter.createdAt = dateFilter;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);

  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
};

/**
 * Admin: financial metrics — totals by status, revenue by day/week/month.
 */
export const adminPaymentMetrics = async () => {
  const now = new Date();

  // Define time windows
  const startOfDay   = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [overallResult, dailyResult, weeklyResult, monthlyResult] = await Promise.all([
    // Overall totals by status
    Payment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
    ]),
    // Today's revenue
    Payment.aggregate([
      { $match: { status: "SUCCESS", createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    // This week's revenue
    Payment.aggregate([
      { $match: { status: "SUCCESS", createdAt: { $gte: startOfWeek } } },
      { $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    // This month's revenue
    Payment.aggregate([
      { $match: { status: "SUCCESS", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const summary = { totalPending: 0, totalSuccess: 0, totalFailed: 0, totalRevenue: 0 };
  for (const row of overallResult) {
    switch (row._id) {
      case "PENDING": summary.totalPending = row.count; break;
      case "SUCCESS": summary.totalSuccess = row.count; summary.totalRevenue = row.totalAmount; break;
      case "FAILED":  summary.totalFailed  = row.count; break;
    }
  }

  return {
    summary,
    revenue: {
      daily:   dailyResult[0]   ? { amount: dailyResult[0].revenue,   count: dailyResult[0].count }   : { amount: 0, count: 0 },
      weekly:  weeklyResult[0]  ? { amount: weeklyResult[0].revenue,  count: weeklyResult[0].count }  : { amount: 0, count: 0 },
      monthly: monthlyResult[0] ? { amount: monthlyResult[0].revenue, count: monthlyResult[0].count } : { amount: 0, count: 0 },
    },
  };
};
