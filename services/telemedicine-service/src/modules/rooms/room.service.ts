import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import {
  createConsultationRoom,
  findConsultationRoomById,
  findConsultationRoomByKey,
  findConsultationRoomByParticipants,
  markRoomAsExpiredIfNeeded,
  updateConsultationRoom,
} from "./room.repository.js";
import type {
  ConsultationRoomView,
  CreateConsultationRoomInput,
} from "./room.types.js";

function sanitizeRoomSegment(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (sanitized.length > 0) {
    return sanitized.slice(0, 18);
  }

  return "participant";
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildJitsiRoomData(
  doctorId: string,
  patientId: string,
): {
  roomKey: string;
  meetingProvider: "jitsi";
  jitsiRoomName: string;
  jitsiRoomUrl: string;
} {
  const doctor = sanitizeRoomSegment(doctorId);
  const patient = sanitizeRoomSegment(patientId);
  const entropy = randomUUID().replace(/-/g, "").slice(0, 12);
  const roomName = `arogya-${doctor}-${patient}-${entropy}`;
  const baseUrl = trimTrailingSlash(env.jitsiBaseUrl);

  return {
    roomKey: roomName,
    meetingProvider: "jitsi",
    jitsiRoomName: roomName,
    jitsiRoomUrl: `${baseUrl}/${roomName}`,
  };
}

async function createUniqueRoomData(
  doctorId: string,
  patientId: string,
): Promise<{
  roomKey: string;
  meetingProvider: "jitsi";
  jitsiRoomName: string;
  jitsiRoomUrl: string;
}> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomData = buildJitsiRoomData(doctorId, patientId);
    const existing = await findConsultationRoomByKey(roomData.roomKey);
    if (!existing) {
      return roomData;
    }
  }

  throw new HttpError(500, "Failed to allocate unique room key");
}

function hasJitsiMetadata(room: ConsultationRoomView): boolean {
  return (
    room.meetingProvider === "jitsi" &&
    typeof room.jitsiRoomName === "string" &&
    room.jitsiRoomName.length > 0 &&
    typeof room.jitsiRoomUrl === "string" &&
    room.jitsiRoomUrl.length > 0 &&
    room.roomKey === room.jitsiRoomName
  );
}

async function ensureRoomIsJitsiReady(
  room: ConsultationRoomView,
): Promise<ConsultationRoomView> {
  if (hasJitsiMetadata(room)) {
    return room;
  }

  const roomData = await createUniqueRoomData(room.doctorId, room.patientId);
  const upgraded = await updateConsultationRoom(room.id, {
    roomKey: roomData.roomKey,
    meetingProvider: roomData.meetingProvider,
    jitsiRoomName: roomData.jitsiRoomName,
    jitsiRoomUrl: roomData.jitsiRoomUrl,
  });

  if (!upgraded) {
    throw new HttpError(500, "Failed to upgrade room key metadata");
  }

  return upgraded;
}

export function assertRoomIsUsable(room: ConsultationRoomView): void {
  if (room.status === "closed") {
    throw new HttpError(409, "Room is closed");
  }

  if (room.status === "expired" || room.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(
      409,
      "Room has expired. Reopen the room before scheduling",
    );
  }
}

export async function createRoom(
  input: CreateConsultationRoomInput,
): Promise<ConsultationRoomView> {
  const existingRoom = await findConsultationRoomByParticipants(
    input.doctorId,
    input.patientId,
  );

  if (!existingRoom) {
    const roomData = await createUniqueRoomData(
      input.doctorId,
      input.patientId,
    );
    return createConsultationRoom(input, roomData);
  }

  const room = await markRoomAsExpiredIfNeeded(existingRoom);
  if (room.status === "open") {
    return ensureRoomIsJitsiReady(room);
  }

  throw new HttpError(409, "Room exists but is not open. Reopen it explicitly");
}

export async function reopenRoom(
  roomKey: string,
  expiresAt: Date,
): Promise<ConsultationRoomView> {
  const room = await findConsultationRoomByKey(roomKey);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  const updated = await updateConsultationRoom(room.id, {
    status: "open",
    expiresAt,
  });

  if (!updated) {
    throw new HttpError(500, "Failed to reopen room");
  }

  return updated;
}

export async function getUsableRoomByParticipants(
  doctorId: string,
  patientId: string,
): Promise<ConsultationRoomView> {
  const room = await findConsultationRoomByParticipants(doctorId, patientId);
  if (!room) {
    throw new HttpError(400, "Room does not exist for this doctor and patient");
  }

  const normalizedRoom = await markRoomAsExpiredIfNeeded(room);
  assertRoomIsUsable(normalizedRoom);
  return normalizedRoom;
}

export async function getUsableRoomByIdForParticipants(
  roomId: string,
  doctorId: string,
  patientId: string,
): Promise<ConsultationRoomView> {
  const room = await findConsultationRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.doctorId !== doctorId || room.patientId !== patientId) {
    throw new HttpError(409, "Room does not match doctor and patient");
  }

  const normalizedRoom = await markRoomAsExpiredIfNeeded(room);
  assertRoomIsUsable(normalizedRoom);
  return normalizedRoom;
}

export async function getOrCreateUsableRoomByParticipants(
  doctorId: string,
  patientId: string,
): Promise<ConsultationRoomView> {
  const existing = await findConsultationRoomByParticipants(
    doctorId,
    patientId,
  );

  if (!existing) {
    const roomData = await createUniqueRoomData(doctorId, patientId);
    return createConsultationRoom(
      {
        doctorId,
        patientId,
        expiresAt: new Date(
          Date.now() + env.roomDefaultExpiryHours * 60 * 60 * 1000,
        ),
      },
      roomData,
    );
  }

  const normalizedRoom = await markRoomAsExpiredIfNeeded(existing);
  if (normalizedRoom.status === "closed") {
    throw new HttpError(409, "Room is closed");
  }

  if (normalizedRoom.status === "expired") {
    const reopened = await updateConsultationRoom(normalizedRoom.id, {
      status: "open",
      expiresAt: new Date(
        Date.now() + env.roomDefaultExpiryHours * 60 * 60 * 1000,
      ),
    });

    if (!reopened) {
      throw new HttpError(500, "Failed to reopen room");
    }

    return ensureRoomIsJitsiReady(reopened);
  }

  return ensureRoomIsJitsiReady(normalizedRoom);
}

export async function setRoomExpiryFromConsultation(
  roomId: string,
  startsAt: Date,
  expirationHours: number,
): Promise<ConsultationRoomView> {
  const room = await findConsultationRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  const candidateExpiresAt = new Date(
    startsAt.getTime() + expirationHours * 60 * 60 * 1000,
  );

  const updated = await updateConsultationRoom(room.id, {
    expiresAt: candidateExpiresAt,
  });

  if (!updated) {
    throw new HttpError(500, "Failed to update room expiration");
  }

  return updated;
}
