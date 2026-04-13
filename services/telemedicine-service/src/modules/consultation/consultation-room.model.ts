import { Schema, model } from "mongoose";
import type { ConsultationRoomStatus } from "./consultation.types.js";

export interface ConsultationRoomDocument {
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

const consultationRoomSchema = new Schema<ConsultationRoomDocument>(
  {
    doctorId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    roomKey: { type: String, required: true, unique: true, index: true },
    meetingProvider: {
      type: String,
      enum: ["jitsi"],
      default: "jitsi",
      required: true,
    },
    jitsiRoomName: { type: String, required: true, unique: true, index: true },
    jitsiRoomUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "expired", "closed"],
      default: "open",
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  },
);

consultationRoomSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

export const ConsultationRoomModel = model<ConsultationRoomDocument>(
  "ConsultationRoom",
  consultationRoomSchema,
);
