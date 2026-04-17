import api from "../../../lib/telemedicineApi";

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

export interface TelemedicineActorContext {
  id: string;
  role: ChatRole;
}

function actorHeaders(
  actor?: TelemedicineActorContext,
): Record<string, string> | undefined {
  if (!actor) {
    return undefined;
  }

  return {
    "x-user-id": actor.id,
    "x-user-role": actor.role,
  };
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

export async function fetchDoctorConsultations(
  doctorId: string,
): Promise<ConsultationView[]> {
  const { data } = await api.get(
    `/telemedicine/consultations/doctor/${doctorId}`,
  );
  return (data.data ?? data) as ConsultationView[];
}

export async function fetchPatientConsultations(
  patientId: string,
): Promise<ConsultationView[]> {
  const { data } = await api.get(
    `/telemedicine/consultations/patient/${patientId}`,
  );
  return (data.data ?? data) as ConsultationView[];
}

export async function fetchDoctorRooms(
  doctorId: string,
  activeOnly = true,
): Promise<ConsultationRoom[]> {
  const { data } = await api.get(`/telemedicine/rooms/doctor/${doctorId}`, {
    params: { activeOnly },
  });
  return (data.data ?? data) as ConsultationRoom[];
}

export async function fetchRoomById(roomId: string): Promise<ConsultationRoom> {
  const { data } = await api.get(`/telemedicine/rooms/${roomId}`);
  return (data.data ?? data) as ConsultationRoom;
}

export async function fetchPatientRooms(
  patientId: string,
  activeOnly = true,
): Promise<ConsultationRoom[]> {
  const { data } = await api.get(`/telemedicine/rooms/patient/${patientId}`, {
    params: { activeOnly },
  });
  return (data.data ?? data) as ConsultationRoom[];
}

export async function fetchConsultationById(
  consultationId: string,
): Promise<ConsultationView> {
  const { data } = await api.get(
    `/telemedicine/consultations/${consultationId}`,
  );
  return (data.data ?? data) as ConsultationView;
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
  callerRole?: string,
): Promise<ConsultationView> {
  const { data } = await api.patch(
    `/telemedicine/consultations/${id}/status`,
    { status },
    callerRole ? { headers: { "x-caller-role": callerRole } } : undefined,
  );
  return (data.data ?? data) as ConsultationView;
}

// ─── Chat REST ────────────────────────────────────────────────────────────────

export async function fetchChatMessages(
  roomId: string,
  before?: string,
  limit = 50,
  actor?: TelemedicineActorContext,
): Promise<ChatMessage[]> {
  const params: Record<string, string | number> = { limit };
  if (before) params.before = before;
  const { data } = await api.get(
    `/telemedicine/chats/rooms/${roomId}/messages`,
    {
      params,
      headers: actorHeaders(actor),
    },
  );
  return (data.data ?? data) as ChatMessage[];
}

export async function sendChatMessageRest(
  roomId: string,
  content: string,
  triageTags?: ChatTriageTag[],
  actor?: TelemedicineActorContext,
): Promise<{ message: ChatMessage; escalationGuidance?: string }> {
  const { data } = await api.post(
    `/telemedicine/chats/rooms/${roomId}/messages`,
    {
      content,
      triageTags,
    },
    {
      headers: actorHeaders(actor),
    },
  );
  return (data.data ?? data) as {
    message: ChatMessage;
    escalationGuidance?: string;
  };
}

// ─── Clinical Notes ───────────────────────────────────────────────────────────

export async function createClinicalNote(
  consultationId: string,
  payload: { soap: SoapNote; patientSummary?: string; status?: NoteStatus },
  actor?: TelemedicineActorContext,
): Promise<ClinicalNote> {
  const { data } = await api.post(
    `/telemedicine/consultations/${consultationId}/notes`,
    payload,
    {
      headers: actorHeaders(actor),
    },
  );
  return (data.data ?? data) as ClinicalNote;
}

export async function fetchClinicalNotes(
  consultationId: string,
  actor?: TelemedicineActorContext,
): Promise<ClinicalNote[]> {
  const { data } = await api.get(
    `/telemedicine/consultations/${consultationId}/notes`,
    {
      headers: actorHeaders(actor),
    },
  );
  return (data.data ?? data) as ClinicalNote[];
}

export async function updateClinicalNote(
  consultationId: string,
  noteId: string,
  payload: {
    soap?: Partial<SoapNote>;
    patientSummary?: string;
    status?: NoteStatus;
  },
  actor?: TelemedicineActorContext,
): Promise<ClinicalNote> {
  const { data } = await api.patch(
    `/telemedicine/consultations/${consultationId}/notes/${noteId}`,
    payload,
    {
      headers: actorHeaders(actor),
    },
  );
  return (data.data ?? data) as ClinicalNote;
}

export async function releaseClinicalNote(
  consultationId: string,
  noteId: string,
  actor?: TelemedicineActorContext,
): Promise<ClinicalNote> {
  const { data } = await api.patch(
    `/telemedicine/consultations/${consultationId}/notes/${noteId}/release`,
    {},
    {
      headers: actorHeaders(actor),
    },
  );
  return (data.data ?? data) as ClinicalNote;
}
