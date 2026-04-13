import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/http/error-handler.js";
import { ServiceClient } from "../../shared/http/service-client.js";
import type { AppointmentSummary } from "../../shared/contracts/index.js";
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

const appointmentServiceClient = new ServiceClient(env.services.appointment);

async function ensureAppointmentExists(appointmentId: string): Promise<void> {
  const result = await appointmentServiceClient.get<AppointmentSummary>(
    `/appointments/${appointmentId}`,
  );

  if (!result.ok || !result.data) {
    throw new HttpError(400, "Invalid appointmentId");
  }
}

export async function createConsultationSession(
  input: CreateConsultationInput,
): Promise<ConsultationView> {
  await ensureAppointmentExists(input.appointmentId);

  return createConsultation(input, randomUUID());
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
): Promise<ConsultationView> {
  const updated = await updateConsultationStatus(id, status);
  if (!updated) {
    throw new HttpError(404, "Consultation not found");
  }

  return updated;
}
