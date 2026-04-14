import { HttpError } from "../../shared/http/error-handler.js";
import {
  createConsultation,
  findConsultationById,
  listConsultations,
  updateConsultationStatus,
} from "./consultation.repository.js";
import type {
  ConsultationStatus,
  ConsultationView,
  CreateConsultationInput,
} from "./consultation.types.js";
import { logger } from "../../shared/logger.js";
import { appointmentService } from "../../clients/appointment.client.js";
import {
  assertRoomIsUsable,
  getOrCreateUsableRoomByParticipants,
  setRoomExpiryFromConsultation,
  getUsableRoomByIdForParticipants,
} from "../rooms/room.service.js";

function isDoctorInitiator(actor: string): boolean {
  const normalized = actor.toLowerCase();
  return normalized === "doctor" || normalized === "doctor-service";
}

export async function createConsultationSession(
  input: CreateConsultationInput,
): Promise<ConsultationView> {
  // await appointmentService.ensureAppointmentExists(input.appointmentId);

  const room = input.roomId
    ? await getUsableRoomByIdForParticipants(
        input.roomId,
        input.doctorId,
        input.patientId,
      )
    : await getOrCreateUsableRoomByParticipants(
        input.doctorId,
        input.patientId,
      );

  const roomWithRefreshedExpiry = await setRoomExpiryFromConsultation(
    room.id,
    input.startsAt,
    input.expirationHours,
  );

  const consultation = await createConsultation(input, roomWithRefreshedExpiry);
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

  assertRoomIsUsable(current.room);

  const updated = await updateConsultationStatus(id, status);
  if (!updated) {
    throw new HttpError(404, "Consultation not found");
  }

  return updated;
}
