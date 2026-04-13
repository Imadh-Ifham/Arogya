import { ConsultationModel } from "./consultation.model.js";
import type {
  ConsultationStatus,
  ConsultationView,
  CreateConsultationInput,
} from "./consultation.types.js";

function mapToView(model: any): ConsultationView {
  return {
    id: model._id.toString(),
    appointmentId: model.appointmentId,
    patientId: model.patientId,
    doctorId: model.doctorId,
    startsAt: model.startsAt,
    roomKey: model.roomKey,
    status: model.status,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

export async function createConsultation(
  input: CreateConsultationInput,
  roomKey: string,
): Promise<ConsultationView> {
  const created = await ConsultationModel.create({
    ...input,
    roomKey,
    status: "scheduled",
  });

  return mapToView(created);
}

export async function listConsultations(): Promise<ConsultationView[]> {
  const consultations = await ConsultationModel.find().sort({ startsAt: 1 });
  return consultations.map(mapToView);
}

export async function findConsultationById(
  id: string,
): Promise<ConsultationView | null> {
  const consultation = await ConsultationModel.findById(id);
  return consultation ? mapToView(consultation) : null;
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
): Promise<ConsultationView | null> {
  const consultation = await ConsultationModel.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );

  return consultation ? mapToView(consultation) : null;
}
