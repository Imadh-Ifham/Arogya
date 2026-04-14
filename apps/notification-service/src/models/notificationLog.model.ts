import mongoose, { Schema, Document } from "mongoose";
import {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
} from "../types/notification.types";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface INotificationLog extends Document {
  // Who received the notification
  recipientPhone?: string;   // E.164 format e.g. +94771234567
  recipientEmail?: string;
  recipientName?: string;
  patientId?: string;        // raw patient ID from the requesting service

  channel: NotificationChannel;
  eventType: NotificationEventType;
  status: NotificationStatus;

  // The resolved body/subject that was actually sent (after template substitution)
  subject?: string;          // email only
  body: string;

  // Correlation — link back to what triggered this notification
  templateId?: mongoose.Types.ObjectId;
  templateSlug?: string;
  templateVariables?: Record<string, string>;

  // Third-party provider response
  providerMessageId?: string;  // Twilio SID or SendGrid message ID
  providerResponse?: string;   // JSON-stringified raw provider response

  // Error details on FAILED status
  errorMessage?: string;
  attemptCount: number;        // how many tries before final status

  // Compliance timestamps
  sentAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const notificationLogSchema = new Schema<INotificationLog>(
  {
    recipientPhone: { type: String, trim: true },
    recipientEmail: { type: String, trim: true, lowercase: true },
    recipientName: { type: String, trim: true },
    patientId: { type: String, trim: true },

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
    status: {
      type: String,
      enum: ["SENT", "FAILED", "PENDING"] satisfies NotificationStatus[],
      default: "PENDING",
    },

    subject: { type: String },
    body: { type: String, required: [true, "Body is required"] },

    templateId: { type: Schema.Types.ObjectId, ref: "MessageTemplate" },
    templateSlug: { type: String },
    templateVariables: { type: Schema.Types.Mixed },

    providerMessageId: { type: String },
    providerResponse: { type: String },

    errorMessage: { type: String },
    attemptCount: { type: Number, default: 1 },

    sentAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true },
);

// Compound index — most common query pattern for the audit log UI
notificationLogSchema.index({ eventType: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ patientId: 1, createdAt: -1 });
notificationLogSchema.index({ recipientEmail: 1, createdAt: -1 });

export const NotificationLog = mongoose.model<INotificationLog>(
  "NotificationLog",
  notificationLogSchema,
);
