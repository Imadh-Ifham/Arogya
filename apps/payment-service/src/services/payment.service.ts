import { v4 as uuidv4 } from "uuid";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import { Payment } from "../models/payment.model";
import { PaymentEvent } from "../models/paymentEvent.model";
import {
  InitiatePaymentBody,
  InitiatePaymentResponse,
} from "../types/payment.types";

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
