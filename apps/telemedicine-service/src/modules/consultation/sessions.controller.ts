import type { Request, Response } from "express";
import type { ApiResponse } from "../../shared/types/api-response.js";
import { HttpError } from "../../shared/http/error-handler.js";
import { createConsultationSession, getConsultationByAppointmentId } from "./consultation.service.js";

const DEFAULT_EXPIRATION_HOURS = 2;

/**
 * POST /sessions
 *
 * Simplified session-creation endpoint consumed by appointment-service.
 * Accepts the minimal payload the appointment-service sends and returns
 * { meetingUrl } so the appointment record can store the Jitsi link.
 *
 * If a consultation for this appointmentId already exists (idempotent
 * re-approval or retry), the existing meeting URL is returned unchanged.
 */
export async function createSessionHandler(
  req: Request,
  res: Response<ApiResponse<{ meetingUrl: string }>>,
): Promise<void> {
  const { appointmentId, patientId, doctorId, startsAt, expirationHours } =
    req.body as Partial<{
      appointmentId: string;
      patientId: string;
      doctorId: string;
      startsAt: string;
      expirationHours: number;
    }>;

  if (!appointmentId || !patientId || !doctorId) {
    throw new HttpError(400, "appointmentId, patientId and doctorId are required");
  }

  // Idempotency: return existing session if one already exists for this appointment
  const existing = await getConsultationByAppointmentId(appointmentId);
  if (existing) {
    res.status(200).json({
      success: true,
      data: { meetingUrl: existing.room.jitsiRoomUrl },
    });
    return;
  }

  const resolvedStartsAt = startsAt ? new Date(startsAt) : new Date();
  if (Number.isNaN(resolvedStartsAt.getTime())) {
    throw new HttpError(400, "Invalid startsAt value");
  }

  const resolvedExpirationHours =
    typeof expirationHours === "number" && Number.isInteger(expirationHours) && expirationHours > 0
      ? expirationHours
      : DEFAULT_EXPIRATION_HOURS;

  const consultation = await createConsultationSession({
    appointmentId,
    patientId,
    doctorId,
    startsAt: resolvedStartsAt,
    expirationHours: resolvedExpirationHours,
  });

  res.status(201).json({
    success: true,
    data: { meetingUrl: consultation.room.jitsiRoomUrl },
  });
}
