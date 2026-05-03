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

type ConsultationActorRole = "doctor" | "patient" | "admin" | "service";

type ConsultationActor = {
  id: string;
  role: ConsultationActorRole;
};

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

function parseActorFromRequest(req: Request): ConsultationActor {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role") as ConsultationActorRole | undefined;

  if (id && role) {
    if (role !== "doctor" && role !== "patient" && role !== "admin") {
      throw new HttpError(401, "Invalid x-user-role header");
    }

    return { id, role };
  }

  const service = req.header("x-caller-service");
  if (service) {
    return { id: service, role: "service" };
  }

  throw new HttpError(401, "Missing x-user-id or x-user-role header");
}

function isPrivilegedActor(actor: ConsultationActor): boolean {
  return actor.role === "admin" || actor.role === "service";
}

function assertDoctorAccess(actor: ConsultationActor, doctorId: string): void {
  if (isPrivilegedActor(actor)) return;
  if (actor.role !== "doctor" || actor.id !== doctorId) {
    throw new HttpError(403, "Not authorized to access this doctor scope");
  }
}

function assertPatientAccess(
  actor: ConsultationActor,
  patientId: string,
): void {
  if (isPrivilegedActor(actor)) return;
  if (actor.role !== "patient" || actor.id !== patientId) {
    throw new HttpError(403, "Not authorized to access this patient scope");
  }
}

function assertConsultationAccess(
  actor: ConsultationActor,
  consultation: ConsultationView,
): void {
  if (isPrivilegedActor(actor)) return;

  if (actor.role === "doctor" && consultation.doctorId === actor.id) {
    return;
  }

  if (actor.role === "patient" && consultation.patientId === actor.id) {
    return;
  }

  throw new HttpError(403, "Not authorized to access this consultation");
}

export async function createConsultationHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
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

  if (!isPrivilegedActor(actor)) {
    if (actor.role !== "doctor" || actor.id !== doctorId) {
      throw new HttpError(
        403,
        "Only the assigned doctor can create a consultation",
      );
    }
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
  req: Request,
  res: Response<ApiResponse<ConsultationView[]>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  if (!isPrivilegedActor(actor)) {
    throw new HttpError(403, "Not authorized to list all consultations");
  }
  const consultations = await getConsultations();
  res.status(200).json({ success: true, data: consultations });
}

export async function getConsultationByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  const consultationId = requiredParam(req.params.id, "id");
  const consultation = await getConsultationById(consultationId);
  assertConsultationAccess(actor, consultation);
  res.status(200).json({ success: true, data: consultation });
}

export async function getConsultationsByDoctorIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView[]>>,
): Promise<void> {
  const doctorId = requiredParam(req.params.doctorId, "doctorId");
  const actor = parseActorFromRequest(req);
  assertDoctorAccess(actor, doctorId);
  const consultations = await getConsultationsByDoctorId(doctorId);
  res.status(200).json({ success: true, data: consultations });
}

export async function getConsultationsByPatientIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView[]>>,
): Promise<void> {
  const patientId = requiredParam(req.params.patientId, "patientId");
  const actor = parseActorFromRequest(req);
  assertPatientAccess(actor, patientId);
  const consultations = await getConsultationsByPatientId(patientId);
  res.status(200).json({ success: true, data: consultations });
}

export async function getConsultationByAppointmentIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationView | null>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  const appointmentId = requiredParam(
    req.params.appointmentId,
    "appointmentId",
  );
  const consultation = await getConsultationByAppointmentId(appointmentId);
  if (consultation) {
    assertConsultationAccess(actor, consultation);
  }
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
  const actor = parseActorFromRequest(req);
  const existing = await getConsultationById(consultationId);
  assertConsultationAccess(actor, existing);
  const consultation = await changeConsultationStatus(
    consultationId,
    status,
    actor.role,
  );
  res.status(200).json({ success: true, data: consultation });
}
