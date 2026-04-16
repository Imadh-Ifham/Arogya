import { Types } from "mongoose";
import { ConsultationModel } from "./consultation.model.js";
import type {
  ConsultationStatus,
  ConsultationView,
  CreateConsultationInput,
} from "./consultation.types.js";
import type { ConsultationRoomView } from "../rooms/room.types.js";
import {
  findConsultationRoomById,
  getConsultationRoomsMap,
} from "../rooms/room.repository.js";

interface ConsultationDocumentView {
  _id: Types.ObjectId;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
  status: ConsultationStatus;
  roomId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

function mapMeetingToView(
  model: ConsultationDocumentView,
  room: ConsultationRoomView,
): ConsultationView {
  return {
    id: model._id.toString(),
    appointmentId: model.appointmentId,
    patientId: model.patientId,
    doctorId: model.doctorId,
    startsAt: model.startsAt,
    status: model.status,
    room,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

export async function createConsultation(
  input: CreateConsultationInput,
  room: ConsultationRoomView,
): Promise<ConsultationView> {
  const created = (await ConsultationModel.create({
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    doctorId: input.doctorId,
    startsAt: input.startsAt,
    roomId: room.id,
    status: "scheduled",
  })) as unknown as ConsultationDocumentView;

  return mapMeetingToView(created, room);
}

export async function listConsultations(): Promise<ConsultationView[]> {
  const consultations = (await ConsultationModel.find()
    .sort({ startsAt: 1 })
    .lean()) as ConsultationDocumentView[];
  const roomsMap = await getConsultationRoomsMap(
    consultations.map((item) => item.roomId),
  );

  return consultations
    .map((consultation) => {
      const room = roomsMap.get(consultation.roomId.toString());
      if (!room) {
        return null;
      }

      return mapMeetingToView(consultation, room);
    })
    .filter(
      (consultation): consultation is ConsultationView => consultation !== null,
    );
}

export async function listConsultationsByDoctorId(
  doctorId: string,
): Promise<ConsultationView[]> {
  const consultations = (await ConsultationModel.find({ doctorId })
    .sort({ startsAt: 1 })
    .lean()) as ConsultationDocumentView[];
  const roomsMap = await getConsultationRoomsMap(
    consultations.map((item) => item.roomId),
  );

  return consultations
    .map((consultation) => {
      const room = roomsMap.get(consultation.roomId.toString());
      if (!room) {
        return null;
      }

      return mapMeetingToView(consultation, room);
    })
    .filter(
      (consultation): consultation is ConsultationView => consultation !== null,
    );
}

export async function listConsultationsByPatientId(
  patientId: string,
): Promise<ConsultationView[]> {
  const consultations = (await ConsultationModel.find({ patientId })
    .sort({ startsAt: 1 })
    .lean()) as ConsultationDocumentView[];
  const roomsMap = await getConsultationRoomsMap(
    consultations.map((item) => item.roomId),
  );

  return consultations
    .map((consultation) => {
      const room = roomsMap.get(consultation.roomId.toString());
      if (!room) {
        return null;
      }

      return mapMeetingToView(consultation, room);
    })
    .filter(
      (consultation): consultation is ConsultationView => consultation !== null,
    );
}

export async function findConsultationById(
  id: string,
): Promise<ConsultationView | null> {
  const consultation = (await ConsultationModel.findById(
    id,
  ).lean()) as ConsultationDocumentView | null;
  if (!consultation) {
    return null;
  }

  const room = await findConsultationRoomById(consultation.roomId.toString());
  if (!room) {
    return null;
  }

  return mapMeetingToView(consultation, room);
}

export async function findConsultationByAppointmentId(
  appointmentId: string,
): Promise<ConsultationView | null> {
  const consultation = (await ConsultationModel.findOne({
    appointmentId,
  }).lean()) as ConsultationDocumentView | null;
  if (!consultation) {
    return null;
  }

  const room = await findConsultationRoomById(consultation.roomId.toString());
  if (!room) {
    return null;
  }

  return mapMeetingToView(consultation, room);
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
): Promise<ConsultationView | null> {
  const consultation = (await ConsultationModel.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: "after" },
  ).lean()) as ConsultationDocumentView | null;

  if (!consultation) {
    return null;
  }

  const room = await findConsultationRoomById(consultation.roomId.toString());
  if (!room) {
    return null;
  }

  return mapMeetingToView(consultation, room);
}
