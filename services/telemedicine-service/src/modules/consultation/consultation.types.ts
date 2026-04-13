export type ConsultationStatus = "scheduled" | "active" | "ended" | "cancelled";

export interface CreateConsultationInput {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
}

export interface ConsultationView {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: Date;
  roomKey: string;
  status: ConsultationStatus;
  createdAt: Date;
  updatedAt: Date;
}
