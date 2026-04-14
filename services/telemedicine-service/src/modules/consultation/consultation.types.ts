import type { ConsultationRoomView } from "../rooms/room.types.js";

export type ConsultationStatus = "scheduled" | "active" | "ended" | "cancelled";

export interface CreateConsultationInput {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
  roomId?: string;
  expirationHours: number;
}

export interface ConsultationView {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
  status: ConsultationStatus;
  room: ConsultationRoomView;
  createdAt: Date;
  updatedAt: Date;
}
