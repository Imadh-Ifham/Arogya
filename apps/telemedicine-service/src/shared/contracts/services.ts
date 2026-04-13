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
  startsAt: string;
  status: "scheduled" | "cancelled" | "completed";
}

export interface ServiceClientResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}
