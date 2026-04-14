export interface PatientSummary {
  id: string;
  fullName: string;
  email?: string;
}

export interface DoctorSummary {
  id: string;
  fullName: string;
  specialty?: string;
}

export interface AppointmentSummary {
  id: string;
  patientId: string;
  doctorId: string;
  /** ISO datetime — present when the slot start time is included in the response */
  startsAt?: string;
  /** Slot creation time — always present */
  createdAt?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  appointmentType: "PHYSICAL" | "ONLINE";
}

export interface ServiceClientResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}
