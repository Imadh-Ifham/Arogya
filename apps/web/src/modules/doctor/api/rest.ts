import api from "../../../lib/api";

// Matches DoctorSummaryDto returned by GET /api/doctors and GET /api/doctors/me
export interface DoctorProfile {
  id?: string | null;   // null when no doctor-service record exists yet (stub 200 from GET /me)
  authUserId: string;
  name: string;
  specialty?: string;
  bio?: string;
  consultationFee?: number;
  licenseNumber?: string;
  qualifications?: string;
  languages?: string[];
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  averageRating?: number;
}

export interface AvailabilitySlot {
  id: number;
  dayOfWeek: string; // "MONDAY" | "TUESDAY" | ...
  startTime: string; // "HH:mm:ss"
  endTime: string;
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

export interface UpdateDoctorProfilePayload {
  name?: string;
  specialty?: string;
  bio?: string;
  consultationFee?: number;
  qualifications?: string;
  languages?: string[];
}

export interface AddAvailabilityPayload {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
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

/** GET /api/doctors/me — returns the logged-in doctor's own profile */
export async function fetchMyDoctorProfile(): Promise<DoctorProfile> {
  const { data } = await api.get("/doctors/me");
  return (data.data ?? data) as DoctorProfile;
}

/** PUT /api/doctors/me — update specialty, bio, consultation fee, etc. */
export async function updateMyDoctorProfile(payload: UpdateDoctorProfilePayload): Promise<DoctorProfile> {
  const { data } = await api.put("/doctors/me", payload);
  return (data.data ?? data) as DoctorProfile;
}

/** GET /api/doctors/{id}/availability — list weekly time slots for a doctor */
export async function getDoctorAvailability(doctorId: string): Promise<AvailabilitySlot[]> {
  const { data } = await api.get(`/doctors/${doctorId}/availability`);
  return (Array.isArray(data) ? data : data.data ?? []) as AvailabilitySlot[];
}

/** POST /api/doctors/{id}/availability — add a weekly slot */
export async function addDoctorAvailability(
  doctorId: string,
  payload: AddAvailabilityPayload,
): Promise<AvailabilitySlot> {
  const { data } = await api.post(`/doctors/${doctorId}/availability`, payload);
  return (data.data ?? data) as AvailabilitySlot;
}

/** DELETE /api/doctors/{id}/availability/{templateId} — remove a slot */
export async function deleteDoctorAvailability(doctorId: string, templateId: number): Promise<void> {
  await api.delete(`/doctors/${doctorId}/availability/${templateId}`);
}
