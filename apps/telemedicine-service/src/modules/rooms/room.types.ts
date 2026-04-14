export type ConsultationRoomStatus = "open" | "expired" | "closed";
export type MeetingProvider = "jitsi";

export interface ConsultationRoomView {
  id: string;
  doctorId: string;
  patientId: string;
  roomKey: string;
  meetingProvider: MeetingProvider;
  jitsiRoomName: string;
  jitsiRoomUrl: string;
  status: ConsultationRoomStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConsultationRoomInput {
  doctorId: string;
  patientId: string;
  expiresAt: Date;
}
