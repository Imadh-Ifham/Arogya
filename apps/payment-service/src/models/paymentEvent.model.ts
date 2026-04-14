import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentEvent extends Document {
  paymentId: string;
  type:
    | "INITIATED"
    | "CHECKOUT_CREATED"
    | "WEBHOOK_RECEIVED"
    | "SUCCESS"
    | "FAILED";
  payload: Record<string, unknown>;
  createdAt: Date;
}

const paymentEventSchema = new Schema<IPaymentEvent>(
  {
    paymentId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "INITIATED",
        "CHECKOUT_CREATED",
        "WEBHOOK_RECEIVED",
        "SUCCESS",
        "FAILED",
      ],
    },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const PaymentEvent = mongoose.model<IPaymentEvent>(
  "PaymentEvent",
  paymentEventSchema,
);
