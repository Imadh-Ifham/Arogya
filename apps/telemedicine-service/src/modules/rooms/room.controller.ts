import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import type { ApiResponse } from "../../shared/types/api-response.js";
import {
  closeRoomById,
  createRoom,
  getRoomByKey,
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

type RoomActorRole = "doctor" | "patient" | "admin" | "service";

type RoomActor = {
  id: string;
  role: RoomActorRole;
};

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

function parseActorFromRequest(req: Request): RoomActor {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role") as RoomActorRole | undefined;

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

function isPrivilegedActor(actor: RoomActor): boolean {
  return actor.role === "admin" || actor.role === "service";
}

function assertRoomAccess(actor: RoomActor, room: ConsultationRoomView): void {
  if (isPrivilegedActor(actor)) return;
  if (actor.role === "doctor" && room.doctorId === actor.id) return;
  if (actor.role === "patient" && room.patientId === actor.id) return;
  throw new HttpError(403, "Not authorized to access this room");
}

function assertRoomDoctorAccess(
  actor: RoomActor,
  room: ConsultationRoomView,
): void {
  if (isPrivilegedActor(actor)) return;
  if (actor.role === "doctor" && room.doctorId === actor.id) return;
  throw new HttpError(403, "Only the assigned doctor can modify this room");
}

export async function createRoomHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  const { doctorId, patientId, expiresAt } = req.body as Partial<{
    doctorId: string;
    patientId: string;
    expiresAt: string;
  }>;

  if (!doctorId || !patientId) {
    throw new HttpError(400, "doctorId and patientId are required");
  }

  if (!isPrivilegedActor(actor)) {
    if (actor.role !== "doctor" || actor.id !== doctorId) {
      throw new HttpError(403, "Only the assigned doctor can create a room");
    }
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
  const actor = parseActorFromRequest(req);
  const roomKey = requiredParam(req.params.roomKey, "roomKey");
  const { expiresAt } = req.body as Partial<{ expiresAt: string }>;

  if (!expiresAt) {
    throw new HttpError(400, "expiresAt is required");
  }

  const existingRoom = await getRoomByKey(roomKey);
  assertRoomDoctorAccess(actor, existingRoom);

  const reopened = await reopenRoom(roomKey, toDate(expiresAt));
  res.status(200).json({ success: true, data: reopened });
}

export async function getRoomByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  const roomId = requiredParam(req.params.id, "id");
  const room = await getRoomById(roomId);
  assertRoomAccess(actor, room);
  res.status(200).json({ success: true, data: room });
}

export async function getRoomsByDoctorIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView[]>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  const doctorId = requiredParam(req.params.doctorId, "doctorId");
  if (!isPrivilegedActor(actor)) {
    if (actor.role !== "doctor" || actor.id !== doctorId) {
      throw new HttpError(403, "Not authorized to access this doctor scope");
    }
  }
  const activeOnly = req.query.activeOnly === "true";
  const rooms = await getRoomsByDoctorId(doctorId, { activeOnly });
  res.status(200).json({ success: true, data: rooms });
}

export async function getRoomsByPatientIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView[]>>,
): Promise<void> {
  const actor = parseActorFromRequest(req);
  const patientId = requiredParam(req.params.patientId, "patientId");
  if (!isPrivilegedActor(actor)) {
    if (actor.role !== "patient" || actor.id !== patientId) {
      throw new HttpError(403, "Not authorized to access this patient scope");
    }
  }
  const activeOnly = req.query.activeOnly === "true";
  const rooms = await getRoomsByPatientId(patientId, { activeOnly });
  res.status(200).json({ success: true, data: rooms });
}

export async function closeRoomByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const actorContext = parseActorFromRequest(req);
  const roomId = requiredParam(req.params.id, "id");
  const room = await getRoomById(roomId);
  assertRoomDoctorAccess(actorContext, room);

  const updated = await closeRoomById(roomId, actorContext.role);
  res.status(200).json({ success: true, data: updated });
}

export async function patchRoomByIdHandler(
  req: Request,
  res: Response<ApiResponse<ConsultationRoomView>>,
): Promise<void> {
  const actorContext = parseActorFromRequest(req);
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

  const room = await getRoomById(roomId);
  assertRoomDoctorAccess(actorContext, room);

  const updated = await patchRoomById(
    roomId,
    {
      status,
      expiresAt: expiresAt ? toDate(expiresAt) : undefined,
    },
    actorContext.role,
  );

  res.status(200).json({ success: true, data: updated });
}
