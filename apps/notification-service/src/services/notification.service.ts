import { NotificationLog, INotificationLog } from "../models/notificationLog.model";
import { findActiveTemplateForEvent } from "./template.service";
import { resolvePatientContact } from "./patient.client";
import { resolveDoctorContact } from "./doctor.client";
import { sendEmail } from "../providers/email.provider";
import { interpolate } from "../utils/templateInterpolator";
import { SendNotificationDto } from "../types/notification.types";
import { NotificationError } from "./template.service";

// ─── Main dispatch function ───────────────────────────────────────────────────
// This is the single function every other service calls.
// It resolves contacts, picks a template, renders the body, dispatches the
// message, and writes an audit log entry — all atomically from the caller's POV.
//
// Recipient resolution priority (first non-null wins):
//   1. recipientEmail passed directly in the DTO
//   2. patientId  → patient-service lookup
//   3. doctorId   → doctor-service  lookup

export const sendNotification = async (
  dto: SendNotificationDto,
): Promise<INotificationLog[]> => {
  // 1. Resolve recipient email + name
  let email = dto.recipientEmail;
  let recipientName = dto.recipientName;

  if (!email && dto.patientId) {
    const contact = await resolvePatientContact(dto.patientId);
    if (contact) {
      email = email ?? contact.email;
      recipientName =
        recipientName ??
        [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    }
  }

  if (!email && dto.doctorId) {
    const contact = await resolveDoctorContact(dto.doctorId);
    if (contact) {
      email = email ?? contact.email;
      recipientName = recipientName ?? contact.name;
    }
  }

  if (!email) {
    throw new NotificationError(
      "No recipient email available — provide recipientEmail, a resolvable patientId, or a resolvable doctorId",
      422,
    );
  }

  // 2. Dispatch via email and return the single log entry
  const log = await dispatchEmail(dto, { email, recipientName });
  return [log];
};

// ─── Email dispatch ───────────────────────────────────────────────────────────

const dispatchEmail = async (
  dto: SendNotificationDto,
  contact: { email: string; recipientName?: string },
): Promise<INotificationLog> => {
  let body: string;
  let subject: string | undefined;
  let templateId: string | undefined;
  let templateSlug: string | undefined;

  if (dto.eventType === "CUSTOM" && dto.customBody) {
    // Ad-hoc email — no DB template needed
    body = dto.customBody;
    subject = dto.customSubject;
  } else {
    const template = await findActiveTemplateForEvent(dto.eventType, "EMAIL");
    if (!template) {
      throw new NotificationError(
        `No active EMAIL template found for event "${dto.eventType}"`,
        422,
      );
    }

    // Inject recipientName automatically so templates can use {{recipientName}}
    const vars = {
      ...(dto.templateVariables ?? {}),
      ...(contact.recipientName ? { recipientName: contact.recipientName } : {}),
    };

    body = interpolate(template.body, vars);
    subject = template.subject ? interpolate(template.subject, vars) : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateId = (template as any)._id?.toString();
    templateSlug = template.slug;
  }

  // Create PENDING log before calling provider — compliance record exists
  // even if the process crashes mid-flight
  const log = await NotificationLog.create({
    recipientEmail: contact.email,
    recipientName: contact.recipientName,
    patientId: dto.patientId,
    channel: "EMAIL",
    eventType: dto.eventType,
    status: "PENDING",
    subject,
    body,
    templateId,
    templateSlug,
    templateVariables: dto.templateVariables,
  });

  const result = await sendEmail({
    to: contact.email,
    toName: contact.recipientName,
    subject: subject ?? "(No subject)",
    htmlBody: body,
  });

  // In development, providerResponse includes the Ethereal preview URL
  const providerResponse = result.previewUrl
    ? JSON.stringify({ previewUrl: result.previewUrl })
    : result.providerResponse;

  await NotificationLog.findByIdAndUpdate(log._id, {
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.providerMessageId,
    providerResponse,
    errorMessage: result.errorMessage,
    sentAt: result.success ? new Date() : undefined,
    failedAt: result.success ? undefined : new Date(),
  });

  return (await NotificationLog.findById(log._id))!;
};

// ─── Audit log queries ────────────────────────────────────────────────────────

export const queryLogs = async (filters: {
  patientId?: string;
  eventType?: string;
  status?: string;
  channel?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: INotificationLog[]; total: number; page: number; pages: number }> => {
  const query: Record<string, unknown> = {};
  if (filters.patientId) query.patientId = filters.patientId;
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.status) query.status = filters.status;
  if (filters.channel) query.channel = filters.channel;

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    NotificationLog.countDocuments(query),
  ]);

  return { logs, total, page, pages: Math.ceil(total / limit) };
};

export const getLogById = async (id: string): Promise<INotificationLog> => {
  const log = await NotificationLog.findById(id);
  if (!log) throw new NotificationError("Notification log not found", 404);
  return log;
};
