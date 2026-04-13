import { Schema, model, type Types } from "mongoose";
import type { ConsultationStatus } from "./consultation.types.js";

export interface ConsultationDocument {
  roomId: Types.ObjectId;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
  status: ConsultationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const consultationSchema = new Schema<ConsultationDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ConsultationRoom",
      required: true,
      index: true,
    },
    appointmentId: { type: String, required: true },
    patientId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    startsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  },
);

consultationSchema.index({ roomId: 1, startsAt: 1 });
consultationSchema.index({ appointmentId: 1 }, { unique: true });

export const ConsultationModel = model<ConsultationDocument>(
  "Consultation",
  consultationSchema,
);
