import type { Request, Response } from "express";
import type { ApiResponse } from "../../shared/types/api-response.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import {
  changeConsultationStatus,
  createRoom,
  createConsultationSession,
  getConsultationById,
  getConsultations,
  reopenRoom,
} from "./consultation.service.js";
import type {
  ConsultationRoomView,
  ConsultationStatus,
  ConsultationView,
  CreateConsultationRoomInput,
  CreateConsultationInput,
} from "./consultation.types.js";

function toDate(input: string): Date {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid startsAt value");
  }
  return parsed;
}

function requiredParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `${name} is required`);
  }
  return value;
}

export async function createConsultationHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView>>,
): Promise<void> {
  const { appointmentId, patientId, doctorId, startsAt } = req.body as Partial<{
    appointmentId: string;
    patientId: string;
    doctorId: string;
    startsAt: string;
  }>;

  if (!appointmentId || !patientId || !doctorId || !startsAt) {
    throw new HttpError(
      400,
      "appointmentId, patientId, doctorId and startsAt are required",
    );
  }

  const payload: CreateConsultationInput = {
    appointmentId,
    patientId,
    doctorId,
    startsAt: toDate(startsAt),
  };

  const consultation = await createConsultationSession(payload);

  res.status(201).json({
    success: true,
    data: consultation,
  });
}

export async function createRoomHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const { doctorId, patientId, expiresAt } = req.body as Partial<{
    doctorId: string;
    patientId: string;
    expiresAt: string;
  }>;

  if (!doctorId || !patientId) {
    throw new HttpError(400, "doctorId and patientId are required");
  }

  const payload: CreateConsultationRoomInput = {
    doctorId,
    patientId,
    expiresAt: expiresAt
      ? toDate(expiresAt)
      : new Date(Date.now() + env.roomDefaultExpiryHours * 60 * 60 * 1000),
  };

  const room = await createRoom(payload);
  res.status(201).json({ success: true, data: room });
}

export async function reopenRoomHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const roomKey = requiredParam(req.params.roomKey, "roomKey");
  const { expiresAt } = req.body as Partial<{ expiresAt: string }>;

  if (!expiresAt) {
    throw new HttpError(400, "expiresAt is required");
  }

  const room = await reopenRoom(roomKey, toDate(expiresAt));
  res.status(200).json({ success: true, data: room });
}

export async function listConsultationsHandler(
  _req: Request,
  res: Response<ApiResponse<ConsultationView[]>>,
): Promise<void> {
  const consultations = await getConsultations();
  res.status(200).json({ success: true, data: consultations });
}

export async function getConsultationByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView>>,
): Promise<void> {
  const consultationId = requiredParam(req.params.id, "id");
  const consultation = await getConsultationById(consultationId);
  res.status(200).json({ success: true, data: consultation });
}

export async function updateConsultationStatusHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView>>,
): Promise<void> {
  const { status } = req.body as { status?: ConsultationStatus };
  if (
    !status ||
    !["scheduled", "active", "ended", "cancelled"].includes(status)
  ) {
    throw new HttpError(400, "Invalid status");
  }

  const consultationId = requiredParam(req.params.id, "id");
  const actor =
    req.header("x-caller-service") ?? req.header("x-caller-role") ?? "unknown";
  const consultation = await changeConsultationStatus(
    consultationId,
    status,
    actor,
  );
  res.status(200).json({ success: true, data: consultation });
}
