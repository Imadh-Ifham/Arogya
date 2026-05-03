import { HttpError } from "../../shared/http/error-handler.js";
import {
  createConsultation,
  findConsultationByAppointmentId,
  findConsultationById,
  listConsultations,
  listConsultationsByDoctorId,
  listConsultationsByPatientId,
  updateConsultationStatus,
} from "./consultation.repository.js";
import type {
  ConsultationStatus,
  ConsultationView,
  CreateConsultationInput,
} from "./consultation.types.js";
import { logger } from "../../shared/logger.js";
import {
  assertRoomIsUsable,
  createFreshRoom,
  setRoomExpiryFromConsultation,
  getUsableRoomByIdForParticipants,
} from "../rooms/room.service.js";

function isDoctorInitiator(actor: string): boolean {
  const normalized = actor.toLowerCase();
  return (
    normalized === "doctor" ||
    normalized === "doctor-service" ||
    normalized === "admin" ||
    normalized === "service" ||
    normalized === "appointment-service"
  );
}

export async function createConsultationSession(
  input: CreateConsultationInput,
): Promise<ConsultationView> {
  const room = input.roomId
    ? await getUsableRoomByIdForParticipants(
        input.roomId,
        input.doctorId,
        input.patientId,
      )
    : await createFreshRoom(
        input.doctorId,
        input.patientId,
        input.expirationHours,
      );

  const roomWithRefreshedExpiry = await setRoomExpiryFromConsultation(
    room.id,
    input.startsAt,
    input.expirationHours,
  );

  try {
    const consultation = await createConsultation(
      input,
      roomWithRefreshedExpiry,
    );
    logger.info(
      {
        consultationId: consultation.id,
        roomId: consultation.room.id,
        roomKey: consultation.room.roomKey,
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        doctorId: input.doctorId,
      },
      "Consultation and room successfully created",
    );
    return consultation;
  } catch (err: unknown) {
    // Handle MongoDB duplicate key error (code 11000) caused by a race condition
    // where two concurrent requests both passed the idempotency check above and
    // both attempted to insert. Recover by returning the existing consultation.
    const isDuplicateKey =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000;

    if (isDuplicateKey) {
      logger.warn(
        { appointmentId: input.appointmentId },
        "Duplicate key on consultation insert (race condition) — returning existing",
      );
      const recovered = await findConsultationByAppointmentId(
        input.appointmentId,
      );
      if (recovered) return recovered;
    }

    throw err;
  }
}

export async function getConsultationByAppointmentId(
  appointmentId: string,
): Promise<ConsultationView | null> {
  return findConsultationByAppointmentId(appointmentId);
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

export async function getConsultationsByDoctorId(
  doctorId: string,
): Promise<ConsultationView[]> {
  return listConsultationsByDoctorId(doctorId);
}

export async function getConsultationsByPatientId(
  patientId: string,
): Promise<ConsultationView[]> {
  return listConsultationsByPatientId(patientId);
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

  assertRoomIsUsable(current.room);

  const updated = await updateConsultationStatus(id, status);
  if (!updated) {
    throw new HttpError(404, "Consultation not found");
  }

  return updated;
}
