import { Types } from "mongoose";
import { ConsultationRoomModel } from "./consultation-room.model.js";
import { ConsultationModel } from "./consultation.model.js";
import type {
  ConsultationRoomStatus,
  ConsultationRoomView,
  ConsultationStatus,
  ConsultationView,
  CreateConsultationRoomInput,
  CreateConsultationInput,
} from "./consultation.types.js";

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

interface ConsultationRoomDocumentView {
  _id: Types.ObjectId;
  doctorId: string;
  patientId: string;
  roomKey: string;
  meetingProvider: "jitsi";
  jitsiRoomName: string;
  jitsiRoomUrl: string;
  status: ConsultationRoomStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function mapRoomToView(
  model: ConsultationRoomDocumentView,
): ConsultationRoomView {
  return {
    id: model._id.toString(),
    doctorId: model.doctorId,
    patientId: model.patientId,
    roomKey: model.roomKey,
    meetingProvider: model.meetingProvider,
    jitsiRoomName: model.jitsiRoomName,
    jitsiRoomUrl: model.jitsiRoomUrl,
    status: model.status,
    expiresAt: model.expiresAt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
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

async function getRoomsMap(
  roomIds: Types.ObjectId[],
): Promise<Map<string, ConsultationRoomView>> {
  const uniqueIds = Array.from(
    new Set(roomIds.map((roomId) => roomId.toString())),
  );
  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
  const rooms = (await ConsultationRoomModel.find({
    _id: { $in: objectIds },
  }).lean()) as ConsultationRoomDocumentView[];

  return new Map(
    rooms.map((room) => [room._id.toString(), mapRoomToView(room)]),
  );
}

export async function createConsultationRoom(
  input: CreateConsultationRoomInput,
  roomData: {
    roomKey: string;
    meetingProvider: "jitsi";
    jitsiRoomName: string;
    jitsiRoomUrl: string;
  },
): Promise<ConsultationRoomView> {
  const created = (await ConsultationRoomModel.create({
    ...input,
    ...roomData,
    status: "open",
  })) as unknown as ConsultationRoomDocumentView;

  return mapRoomToView(created);
}

export async function findConsultationRoomByParticipants(
  doctorId: string,
  patientId: string,
): Promise<ConsultationRoomView | null> {
  const room = (await ConsultationRoomModel.findOne({
    doctorId,
    patientId,
  }).lean()) as ConsultationRoomDocumentView | null;

  return room ? mapRoomToView(room) : null;
}

export async function findConsultationRoomByKey(
  roomKey: string,
): Promise<ConsultationRoomView | null> {
  const room = (await ConsultationRoomModel.findOne({
    roomKey,
  }).lean()) as ConsultationRoomDocumentView | null;

  return room ? mapRoomToView(room) : null;
}

export async function updateConsultationRoom(
  roomId: string,
  updates: Partial<
    Omit<
      ConsultationRoomView,
      "id" | "doctorId" | "patientId" | "createdAt" | "updatedAt"
    >
  >,
): Promise<ConsultationRoomView | null> {
  const room = (await ConsultationRoomModel.findByIdAndUpdate(roomId, updates, {
    returnDocument: "after",
  }).lean()) as ConsultationRoomDocumentView | null;

  return room ? mapRoomToView(room) : null;
}

export async function createConsultation(
  input: CreateConsultationInput,
  room: ConsultationRoomView,
): Promise<ConsultationView> {
  const created = (await ConsultationModel.create({
    ...input,
    roomId: room.id,
    status: "scheduled",
  })) as unknown as ConsultationDocumentView;

  return mapMeetingToView(created, room);
}

export async function listConsultations(): Promise<ConsultationView[]> {
  const consultations = (await ConsultationModel.find()
    .sort({ startsAt: 1 })
    .lean()) as ConsultationDocumentView[];
  const roomsMap = await getRoomsMap(consultations.map((item) => item.roomId));

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

  const room = await ConsultationRoomModel.findById(consultation.roomId).lean();
  if (!room) {
    return null;
  }

  return mapMeetingToView(
    consultation,
    mapRoomToView(room as ConsultationRoomDocumentView),
  );
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

  const room = await ConsultationRoomModel.findById(consultation.roomId).lean();
  if (!room) {
    return null;
  }

  return mapMeetingToView(
    consultation,
    mapRoomToView(room as ConsultationRoomDocumentView),
  );
}

export async function markRoomAsExpiredIfNeeded(
  room: ConsultationRoomView,
): Promise<ConsultationRoomView> {
  const isExpired = room.expiresAt.getTime() <= Date.now();
  if (!isExpired || room.status === "expired") {
    return room;
  }

  const updated = await updateConsultationRoom(room.id, { status: "expired" });
  return updated ?? room;
}
