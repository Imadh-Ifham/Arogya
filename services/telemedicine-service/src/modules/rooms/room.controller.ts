import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import type { ApiResponse } from "../../shared/types/api-response.js";
import {
  closeRoomById,
  createRoom,
  getRoomById,
  getRoomsByDoctorId,
  getRoomsByPatientId,
  patchRoomById,
  reopenRoom,
} from "./room.service.js";
import type {
  ConsultationRoomStatus,
  ConsultationRoomView,
  CreateConsultationRoomInput,
} from "./room.types.js";

function toDate(input: string): Date {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid date value");
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

export async function getRoomByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const roomId = requiredParam(req.params.id, "id");
  const room = await getRoomById(roomId);
  res.status(200).json({ success: true, data: room });
}

export async function getRoomsByDoctorIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView[]>>,
): Promise<void> {
  const doctorId = requiredParam(req.params.doctorId, "doctorId");
  const rooms = await getRoomsByDoctorId(doctorId);
  res.status(200).json({ success: true, data: rooms });
}

export async function getRoomsByPatientIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView[]>>,
): Promise<void> {
  const patientId = requiredParam(req.params.patientId, "patientId");
  const rooms = await getRoomsByPatientId(patientId);
  res.status(200).json({ success: true, data: rooms });
}

export async function closeRoomByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const roomId = requiredParam(req.params.id, "id");
  const actor =
    req.header("x-caller-service") ?? req.header("x-caller-role") ?? "unknown";

  const room = await closeRoomById(roomId, actor);
  res.status(200).json({ success: true, data: room });
}

export async function patchRoomByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const roomId = requiredParam(req.params.id, "id");
  const { status, expiresAt } = req.body as {
    status?: ConsultationRoomStatus;
    expiresAt?: string;
  };

  if (status === undefined && expiresAt === undefined) {
    throw new HttpError(400, "At least one of status or expiresAt is required");
  }

  if (status !== undefined && !["open", "expired", "closed"].includes(status)) {
    throw new HttpError(400, "Invalid status");
  }

  const actor =
    req.header("x-caller-service") ?? req.header("x-caller-role") ?? "unknown";

  const room = await patchRoomById(
    roomId,
    {
      status,
      expiresAt: expiresAt ? toDate(expiresAt) : undefined,
    },
    actor,
  );

  res.status(200).json({ success: true, data: room });
}
