import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import type { ApiResponse } from "../../shared/types/api-response.js";
import { createRoom, reopenRoom } from "./room.service.js";
import type {
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
