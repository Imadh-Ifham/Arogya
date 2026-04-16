import type { Request, Response } from "express";
import type { ApiResponse } from "../../shared/types/api-response.js";
import { HttpError } from "../../shared/http/error-handler.js";
import {
  changeConsultationStatus,
  createConsultationSession,
  getConsultationByAppointmentId,
  getConsultationById,
  getConsultations,
  getConsultationsByDoctorId,
  getConsultationsByPatientId,
} from "./consultation.service.js";
import type {
  ConsultationStatus,
  ConsultationView,
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
  const {
    appointmentId,
    patientId,
    doctorId,
    startsAt,
    roomId,
    expirationHours,
  } = req.body as Partial<{
    appointmentId: string;
    patientId: string;
    doctorId: string;
    startsAt: string;
    roomId: string;
    expirationHours: number;
  }>;

  if (!appointmentId || !patientId || !doctorId || !startsAt) {
    throw new HttpError(
      400,
      "appointmentId, patientId, doctorId and startsAt are required",
    );
  }

  if (
    expirationHours !== undefined &&
    (typeof expirationHours !== "number" ||
      !Number.isInteger(expirationHours) ||
      expirationHours <= 0)
  ) {
    throw new HttpError(400, "expirationHours must be a positive integer");
  }

  if (roomId !== undefined && roomId.length === 0) {
    throw new HttpError(400, "roomId must not be empty");
  }

  const payload: CreateConsultationInput = {
    appointmentId,
    patientId,
    doctorId,
    startsAt: toDate(startsAt),
    roomId,
    expirationHours: expirationHours ?? 2,
  };

  const consultation = await createConsultationSession(payload);

  res.status(201).json({
    success: true,
    data: consultation,
  });
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

export async function getConsultationsByDoctorIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView[]>>,
): Promise<void> {
  const doctorId = requiredParam(req.params.doctorId, "doctorId");
  const consultations = await getConsultationsByDoctorId(doctorId);
  res.status(200).json({ success: true, data: consultations });
}

export async function getConsultationsByPatientIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView[]>>,
): Promise<void> {
  const patientId = requiredParam(req.params.patientId, "patientId");
  const consultations = await getConsultationsByPatientId(patientId);
  res.status(200).json({ success: true, data: consultations });
}

export async function getConsultationByAppointmentIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView | null>>,
): Promise<void> {
  const appointmentId = requiredParam(req.params.appointmentId, "appointmentId");
  const consultation = await getConsultationByAppointmentId(appointmentId);
  res.status(200).json({ success: true, data: consultation ?? null });
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
