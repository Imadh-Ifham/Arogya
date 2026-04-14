import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  paymentId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  gateway: string;
  stripeSessionId: string;
  checkoutUrl: string;
  receipt: {
    receiptNumber: string;
    paidAt: Date;
    gatewayReference: string;
    method: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const receiptSchema = new Schema(
  {
    receiptNumber: { type: String, required: true },
    paidAt: { type: Date, required: true },
    gatewayReference: { type: String, required: true },
    method: { type: String, required: true },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true },
    appointmentId: { type: String, required: true, unique: true },
    patientId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "LKR" },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    gateway: { type: String, required: true, default: "stripe" },
    stripeSessionId: { type: String, required: true, index: true },
    checkoutUrl: { type: String, required: true },
    receipt: { type: receiptSchema, default: null },
  },
  {
    timestamps: true,
  },
);

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
