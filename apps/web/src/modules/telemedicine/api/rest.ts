import api from "../../../lib/api";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ConsultationStatus = "scheduled" | "active" | "ended" | "cancelled";
export type RoomStatus = "open" | "expired" | "closed";
export type ChatRole = "doctor" | "patient";
export type ChatTriageTag = "symptom" | "vitals" | "medication" | "follow-up";
export type NoteStatus = "draft" | "final";

export interface ConsultationRoom {
  id: string;
  doctorId: string;
  patientId: string;
  roomKey: string;
  meetingProvider: "jitsi";
  jitsiRoomName: string;
  jitsiRoomUrl: string;
  status: RoomStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationView {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: string;
  status: ConsultationStatus;
  room: ConsultationRoom;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSafetyFlag {
  keyword: string;
  severity: "medium" | "high";
  guidance: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: ChatRole;
  content: string;
  triageTags: ChatTriageTag[];
  attachments: { type: string; url: string; name?: string }[];
  safetyFlags: ChatSafetyFlag[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoapNote {
  subjective: {
    chiefComplaint: string;
    historyOfPresentIllness?: string;
    symptoms?: string[];
  };
  objective?: {
    vitals?: string;
    physicalExam?: string;
    investigations?: string;
  };
  assessment: {
    diagnosis: string;
    notes?: string;
  };
  plan: {
    treatmentPlan: string;
    medications?: string;
    followUpInstructions?: string;
  };
}

export interface ClinicalNote {
  id: string;
  consultationId: string;
  doctorId: string;
  soap: SoapNote;
  patientSummary?: string;
  status: NoteStatus;
  releasedToPatientAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Consultation endpoints ───────────────────────────────────────────────────

export async function createConsultation(payload: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startsAt: string;
  expirationHours?: number;
}): Promise<ConsultationView> {
  const { data } = await api.post("/telemedicine/consultations", {
    ...payload,
    expirationHours: payload.expirationHours ?? 2,
  });
  return (data.data ?? data) as ConsultationView;
}

export async function fetchDoctorConsultations(doctorId: string): Promise<ConsultationView[]> {
  const { data } = await api.get(`/telemedicine/consultations/doctor/${doctorId}`);
  return (data.data ?? data) as ConsultationView[];
}

export async function fetchPatientConsultations(patientId: string): Promise<ConsultationView[]> {
  const { data } = await api.get(`/telemedicine/consultations/patient/${patientId}`);
  return (data.data ?? data) as ConsultationView[];
}

export async function fetchConsultationByAppointment(
  appointmentId: string,
  role: ChatRole,
  userId: string,
): Promise<ConsultationView | null> {
  const list =
    role === "doctor"
      ? await fetchDoctorConsultations(userId)
      : await fetchPatientConsultations(userId);
  return list.find((c) => c.appointmentId === appointmentId) ?? null;
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
): Promise<ConsultationView> {
  const { data } = await api.patch(`/telemedicine/consultations/${id}/status`, { status });
  return (data.data ?? data) as ConsultationView;
}

// ─── Chat REST ────────────────────────────────────────────────────────────────

export async function fetchChatMessages(
  roomId: string,
  before?: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const params: Record<string, string | number> = { limit };
  if (before) params.before = before;
  const { data } = await api.get(`/telemedicine/chats/${roomId}/messages`, { params });
  return (data.data ?? data) as ChatMessage[];
}

export async function sendChatMessageRest(
  roomId: string,
  content: string,
  triageTags?: ChatTriageTag[],
): Promise<{ message: ChatMessage; escalationGuidance?: string }> {
  const { data } = await api.post(`/telemedicine/chats/${roomId}/messages`, {
    content,
    triageTags,
  });
  return (data.data ?? data) as { message: ChatMessage; escalationGuidance?: string };
}

// ─── Clinical Notes ───────────────────────────────────────────────────────────

export async function createClinicalNote(
  consultationId: string,
  payload: { soap: SoapNote; patientSummary?: string; status?: NoteStatus },
): Promise<ClinicalNote> {
  const { data } = await api.post(
    `/telemedicine/consultations/${consultationId}/notes`,
    payload,
  );
  return (data.data ?? data) as ClinicalNote;
}

export async function fetchClinicalNotes(consultationId: string): Promise<ClinicalNote[]> {
  const { data } = await api.get(`/telemedicine/consultations/${consultationId}/notes`);
  return (data.data ?? data) as ClinicalNote[];
}

export async function updateClinicalNote(
  consultationId: string,
  noteId: string,
  payload: { soap?: Partial<SoapNote>; patientSummary?: string; status?: NoteStatus },
): Promise<ClinicalNote> {
  const { data } = await api.patch(
    `/telemedicine/consultations/${consultationId}/notes/${noteId}`,
    payload,
  );
  return (data.data ?? data) as ClinicalNote;
}

export async function releaseClinicalNote(
  consultationId: string,
  noteId: string,
): Promise<ClinicalNote> {
  const { data } = await api.patch(
    `/telemedicine/consultations/${consultationId}/notes/${noteId}/release`,
  );
  return (data.data ?? data) as ClinicalNote;
}
