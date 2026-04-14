import api from "../../../lib/api";

// Matches PatientProfileResponse returned by the patient service
export interface PatientProfile {
  patientId?: string;
  authUserId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  bloodGroup?: string;
  allergies?: string[];
  address?: string;
  city?: string;
  medicalConditions?: string;
  currentMedications?: string;
}

// Payload for POST /patients/profile (upsert) and PUT /patients/profile/me (update)
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  bloodGroup?: string;
  allergies?: string[];
  address?: string;
  city?: string;
  medicalConditions?: string;
  currentMedications?: string;
}

export async function fetchMyProfile(): Promise<PatientProfile> {
  const { data } = await api.get("/patients/profile/me");
  // Response is wrapped in ApiResponse<PatientProfileResponse>
  return (data.data ?? data) as PatientProfile;
}

export async function upsertMyProfile(payload: UpdateProfilePayload): Promise<PatientProfile> {
  const { data } = await api.post("/patients/profile", payload);
  return (data.data ?? data) as PatientProfile;
}

export async function uploadDocument(file: File, documentType: string): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("documentType", documentType);
  await api.post("/patients/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
