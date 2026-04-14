import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import { ServiceClient } from "../../shared/http/service-client.js";
import type { AppointmentSummary } from "../../shared/contracts/index.js";
import {
  createConsultationRoom,
  createConsultation,
  findConsultationRoomByKey,
  findConsultationRoomByParticipants,
  findConsultationById,
  listConsultations,
  markRoomAsExpiredIfNeeded,
  updateConsultationRoom,
  updateConsultationStatus,
} from "./consultation.repository.js";
import type {
  ConsultationRoomView,
  ConsultationStatus,
  ConsultationView,
  CreateConsultationRoomInput,
  CreateConsultationInput,
} from "./consultation.types.js";

const appointmentServiceClient = new ServiceClient(env.services.appointment);

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

async function ensureAppointmentExists(appointmentId: string): Promise<void> {
  const result = await appointmentServiceClient.get<AppointmentSummary>(
    `/appointments/${appointmentId}`,
  );

  if (!result.ok || !result.data) {
    throw new HttpError(400, "Invalid appointmentId");
  }
}

function assertRoomIsUsable(room: ConsultationRoomView): void {
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

function isDoctorInitiator(actor: string): boolean {
  const normalized = actor.toLowerCase();
  return normalized === "doctor" || normalized === "doctor-service";
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

export async function createConsultationSession(
  input: CreateConsultationInput,
): Promise<ConsultationView> {
  await ensureAppointmentExists(input.appointmentId);

  const room = await findConsultationRoomByParticipants(
    input.doctorId,
    input.patientId,
  );

  if (!room) {
    throw new HttpError(400, "Room does not exist for this doctor and patient");
  }

  const normalizedRoom = await markRoomAsExpiredIfNeeded(room);
  assertRoomIsUsable(normalizedRoom);

  return createConsultation(input, normalizedRoom);
}

export async function getConsultationById(
  id: string,
): Promise<ConsultationView> {
  const consultation = await findConsultationById(id);
  if (!consultation) {
    throw new HttpError(404, "Consultation not found");
  }

  return consultation;
}

export async function getConsultations(): Promise<ConsultationView[]> {
  return listConsultations();
}

export async function changeConsultationStatus(
  id: string,
  status: ConsultationStatus,
  actor: string,
): Promise<ConsultationView> {
  if (status === "active" && !isDoctorInitiator(actor)) {
    throw new HttpError(403, "Only doctor can start the meeting");
  }

  const current = await findConsultationById(id);
  if (!current) {
    throw new HttpError(404, "Consultation not found");
  }

  const normalizedRoom = await markRoomAsExpiredIfNeeded(current.room);
  assertRoomIsUsable(normalizedRoom);

  const updated = await updateConsultationStatus(id, status);
  if (!updated) {
    throw new HttpError(404, "Consultation not found");
  }

  return updated;
}
