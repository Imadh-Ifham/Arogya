import { Schema, model } from "mongoose";
import type { ConsultationStatus } from "./consultation.types.js";

interface ConsultationDocument {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
  roomKey: string;
  status: ConsultationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const consultationSchema = new Schema<ConsultationDocument>(
  {
    appointmentId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    startsAt: { type: Date, required: true },
    roomKey: { type: String, required: true, unique: true },
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

export const ConsultationModel = model<ConsultationDocument>(
  "Consultation",
  consultationSchema,
);
