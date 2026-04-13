import api from "../../../lib/api";

// Matches DoctorSummaryDto returned by GET /api/doctors
export interface DoctorProfile {
  id: string;
  authUserId: string;
  name: string;
  specialty?: string;
  bio?: string;
  consultationFee?: number;
  licenseNumber?: string;
  qualifications?: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  averageRating?: number;
}

export interface DoctorSearchFilter {
  specialty?: string;
  status?: "APPROVED";
}

// Payload for POST /api/doctors/register (maps to Doctor entity fields)
export interface RegisterDoctorPayload {
  name: string;
  specialty: string;
  licenseNumber?: string;
  bio?: string;
  consultationFee?: number;
  qualifications?: string;
  languages?: string[];
  authUserId?: string; // fallback when gateway doesn't inject x-user-id
}

export async function searchDoctors(filter?: DoctorSearchFilter): Promise<DoctorProfile[]> {
  const params: Record<string, string> = {};
  if (filter?.specialty) params.specialty = filter.specialty;
  if (filter?.status) params.status = filter.status;
  const { data } = await api.get("/doctors", { params });
  return (Array.isArray(data) ? data : data.data ?? []) as DoctorProfile[];
}

export async function registerDoctor(payload: RegisterDoctorPayload): Promise<DoctorProfile> {
  const { data } = await api.post("/doctors/register", payload);
  return data as DoctorProfile;
}
