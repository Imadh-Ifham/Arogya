// ─── Channel ─────────────────────────────────────────────────────────────────

export type NotificationChannel = "EMAIL";

// ─── Event types ─────────────────────────────────────────────────────────────
// Each event type maps to a specific template slug and determines which channel
// (or channels) to use.

export type NotificationEventType =
  | "APPOINTMENT_CONFIRMATION"   // Appointment booked — Email
  | "APPOINTMENT_REMINDER"       // 24h before appointment — Email
  | "APPOINTMENT_CANCELLATION"   // Appointment cancelled — Email
  | "PAYMENT_RECEIPT"            // Payment successful — Email
  | "PRESCRIPTION_DELIVERY"      // Prescription issued — Email
  | "CUSTOM";                    // Ad-hoc email, body passed inline

// ─── Status of a single dispatch attempt ─────────────────────────────────────

export type NotificationStatus = "SENT" | "FAILED" | "PENDING";

// ─── DTOs received from other services ───────────────────────────────────────

export interface SendNotificationDto {
  // Who to notify — either provide contact directly or a patientId to resolve
  patientId?: string;
  recipientEmail?: string;
  recipientName?: string;

  eventType: NotificationEventType;

  // Template variables — merged into the template body (e.g. {{appointmentDate}})
  templateVariables?: Record<string, string>;

  // For CUSTOM event type: provide body/subject directly without a DB template
  customBody?: string;
  customSubject?: string;
}

export interface SendEmailDto {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  notificationLogId?: string;
}

// ─── Template management ──────────────────────────────────────────────────────

export interface CreateTemplateDto {
  slug: string;                      // machine-readable ID e.g. "appointment_confirmation_sms"
  channel: NotificationChannel;
  eventType: NotificationEventType;
  subject?: string;                  // email subject (supports placeholders)
  body: string;                      // supports {{placeholderName}} syntax
  description?: string;
  isActive?: boolean;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

// ─── API response shape (mirrors auth-service convention) ────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}
