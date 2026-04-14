import { Types } from "mongoose";
import { ConsultationRoomModel } from "./room.model.js";
import type {
  ConsultationRoomStatus,
  ConsultationRoomView,
  CreateConsultationRoomInput,
} from "./room.types.js";

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

export async function findConsultationRoomById(
  id: string,
): Promise<ConsultationRoomView | null> {
  const room = (await ConsultationRoomModel.findById(
    id,
  ).lean()) as ConsultationRoomDocumentView | null;

  return room ? mapRoomToView(room) : null;
}

export async function getConsultationRoomsMap(
  roomIds: Types.ObjectId[],
): Promise<Map<string, ConsultationRoomView>> {
  const uniqueIds = Array.from(
    new Set(roomIds.map((roomId) => roomId.toString())),
  );

  if (uniqueIds.length === 0) {
    return new Map<string, ConsultationRoomView>();
  }

  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
  const rooms = (await ConsultationRoomModel.find({
    _id: { $in: objectIds },
  }).lean()) as ConsultationRoomDocumentView[];

  return new Map(
    rooms.map((room) => [room._id.toString(), mapRoomToView(room)]),
  );
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
