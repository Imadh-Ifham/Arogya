import mongoose, { Schema, Document } from "mongoose";
import {
  NotificationChannel,
  NotificationEventType,
} from "../types/notification.types";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMessageTemplate extends Document {
  // Unique machine-readable identifier — used by callers to select templates
  // e.g. "appointment_confirmation_sms", "payment_receipt_email"
  slug: string;

  channel: NotificationChannel;
  eventType: NotificationEventType;

  // Email subject (can include {{placeholders}})
  subject?: string;

  // Template body — supports {{placeholderName}} syntax.
  // Placeholders are replaced at send-time via interpolatePlaceholders().
  body: string;

  description?: string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9_]+$/,
        "Slug must be lowercase alphanumeric with underscores only",
      ],
    },
    channel: {
      type: String,
      enum: ["SMS", "EMAIL"] satisfies NotificationChannel[],
      required: [true, "Channel is required"],
    },
    eventType: {
      type: String,
      enum: [
        "APPOINTMENT_CONFIRMATION",
        "APPOINTMENT_REMINDER",
        "APPOINTMENT_CANCELLATION",
        "PAYMENT_RECEIPT",
        "PRESCRIPTION_DELIVERY",
        "CUSTOM",
      ] satisfies NotificationEventType[],
      required: [true, "Event type is required"],
    },
    subject: { type: String, trim: true },
    body: { type: String, required: [true, "Body is required"] },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

messageTemplateSchema.index({ channel: 1, eventType: 1, isActive: 1 });

export const MessageTemplate = mongoose.model<IMessageTemplate>(
  "MessageTemplate",
  messageTemplateSchema,
);
