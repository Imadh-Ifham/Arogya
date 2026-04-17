import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  createClinicalNote,
  createConsultation,
  fetchChatMessages,
  fetchClinicalNotes,
  fetchDoctorConsultations,
  fetchPatientConsultations,
  fetchRoomById,
  releaseClinicalNote,
  sendChatMessageRest,
  updateClinicalNote,
  updateConsultationStatus,
  type ChatMessage,
  type ClinicalNote,
  type ConsultationRoom,
  type ConsultationStatus,
  type ConsultationView,
  type SoapNote,
  type TelemedicineActorContext,
} from "../modules/telemedicine/api/rest";
import Navbar from "../components/Navbar";
import {
  Activity,
  CalendarClock,
  ClipboardPlus,
  FileText,
  MessageSquare,
  Play,
  Send,
  Stethoscope,
  User,
  Video,
  XCircle,
} from "lucide-react";

type Role = "doctor" | "patient";

type DummyPatientRecord = {
  displayId: string;
  ageBand: string;
  bloodGroup: string;
  allergies: string;
  chronic: string;
  triage: string;
};

type DummyDoctorProfile = {
  displayId: string;
  name: string;
  specialty: string;
  qualification: string;
  languages: string;
  careTip: string;
};

const EMPTY_SOAP: SoapNote = {
  subjective: { chiefComplaint: "" },
  assessment: { diagnosis: "" },
  plan: { treatmentPlan: "" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortRoomId(roomId: string): string {
  return `TM-RM-${roomId.slice(-6).toUpperCase()}`;
}

function dummyPatientRecord(room: ConsultationRoom): DummyPatientRecord {
  const options: DummyPatientRecord[] = [
    {
      displayId: `PT-${room.patientId.slice(-4)}`,
      ageBand: "29-34",
      bloodGroup: "B+",
      allergies: "Penicillin",
      chronic: "Mild asthma",
      triage: "Follow-up respiratory",
    },
    {
      displayId: `PT-${room.patientId.slice(-4)}`,
      ageBand: "40-45",
      bloodGroup: "O+",
      allergies: "No known allergies",
      chronic: "Type-2 diabetes",
      triage: "Medication review",
    },
  ];

  return options[room.id.charCodeAt(room.id.length - 1) % options.length];
}

function dummyDoctorProfile(room: ConsultationRoom): DummyDoctorProfile {
  const options: DummyDoctorProfile[] = [
    {
      displayId: `DR-${room.doctorId.slice(-4)}`,
      name: "Dr. Anika Rao",
      specialty: "Internal Medicine",
      qualification: "MD, Internal Medicine",
      languages: "English, Hindi, Tamil",
      careTip: "Keep recent vitals ready before consult starts.",
    },
    {
      displayId: `DR-${room.doctorId.slice(-4)}`,
      name: "Dr. Kabir Menon",
      specialty: "Cardiology",
      qualification: "DM, Cardiology",
      languages: "English, Hindi, Malayalam",
      careTip: "Share any recent ECG or lab readings if available.",
    },
  ];

  return options[room.id.charCodeAt(0) % options.length];
}

function statusPill(status: ConsultationStatus): string {
  if (status === "active") return "bg-green-50 text-green-700 border-green-200";
  if (status === "scheduled") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "ended") return "bg-gray-50 text-gray-700 border-gray-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 w-full overflow-hidden px-3 py-3">
        {children}
      </main>
    </div>
  );
}

export default function TelemedicineRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { pathname } = useLocation();

  const role: Role = pathname.startsWith("/doctor/") ? "doctor" : "patient";
  const userId = role === "doctor" ? "1111111111" : "2222222222";
  const actor: TelemedicineActorContext = { id: userId, role };

  const [room, setRoom] = useState<ConsultationRoom | null>(null);
  const [consultations, setConsultations] = useState<ConsultationView[]>([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [soap, setSoap] = useState<SoapNote>(EMPTY_SOAP);
  const [noteSummary, setNoteSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState("");
  const [createTime, setCreateTime] = useState("");
  const [creatingConsultation, setCreatingConsultation] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedConsultation = useMemo(
    () => consultations.find((c) => c.id === selectedConsultationId) ?? null,
    [consultations, selectedConsultationId],
  );

  const canOpenVideo =
    !!selectedConsultation &&
    (role === "doctor" || selectedConsultation.status === "active");

  async function reloadRoomData() {
    if (!roomId) return;

    const loadedRoom = await fetchRoomById(roomId);
    setRoom(loadedRoom);

    const allConsultations =
      role === "doctor"
        ? await fetchDoctorConsultations(userId)
        : await fetchPatientConsultations(userId);

    const roomConsultations = allConsultations
      .filter((c) => c.room.id === roomId)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );

    setConsultations(roomConsultations);
    if (!selectedConsultationId && roomConsultations.length > 0) {
      setSelectedConsultationId(roomConsultations[0].id);
    }
  }

  useEffect(() => {
    if (!roomId) {
      setError("Room id is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    reloadRoomData()
      .catch(() => setError("Failed to load room workspace."))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    fetchChatMessages(roomId, undefined, 50, actor)
      .then(setMessages)
      .catch(() => undefined);

    const timer = window.setInterval(() => {
      fetchChatMessages(roomId, undefined, 50, actor)
        .then(setMessages)
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [roomId, userId, role]);

  useEffect(() => {
    if (!selectedConsultationId) {
      setNotes([]);
      return;
    }

    fetchClinicalNotes(selectedConsultationId, actor)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [selectedConsultationId, userId, role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!roomId || !chatInput.trim()) return;

    const result = await sendChatMessageRest(
      roomId,
      chatInput.trim(),
      undefined,
      actor,
    );
    setChatInput("");
    setMessages((prev) => [...prev, result.message]);
  }

  async function handleStartConsultation(id: string) {
    const updated = await updateConsultationStatus(id, "active", role);
    setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleEndConsultation(id: string) {
    const updated = await updateConsultationStatus(id, "ended", role);
    setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  function openCreateConsultationModal() {
    const initial = new Date(Date.now() + 10 * 60 * 1000);
    setCreateDate(toDateInputValue(initial));
    setCreateTime(toTimeInputValue(initial));
    setCreateModalError(null);
    setCreateModalOpen(true);
  }

  function closeCreateConsultationModal() {
    if (creatingConsultation) return;
    setCreateModalOpen(false);
    setCreateModalError(null);
  }

  async function handleCreateConsultation() {
    if (!room) return;

    if (!createDate || !createTime) {
      setCreateModalError("Please select both date and time.");
      return;
    }

    const startsAt = new Date(`${createDate}T${createTime}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      setCreateModalError("Selected date/time is invalid.");
      return;
    }

    if (startsAt.getTime() <= Date.now()) {
      setCreateModalError("Please choose a future date/time.");
      return;
    }

    setCreatingConsultation(true);
    setCreateModalError(null);

    const appointmentId = `demo-${Date.now()}`;
    try {
      const created = await createConsultation({
        appointmentId,
        doctorId: room.doctorId,
        patientId: room.patientId,
        startsAt: startsAt.toISOString(),
        expirationHours: 2,
      });

      setConsultations((prev) =>
        [...prev, created].sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      );
      setSelectedConsultationId(created.id);
      setCreateModalOpen(false);
    } catch {
      setCreateModalError("Failed to create consultation. Please try again.");
    } finally {
      setCreatingConsultation(false);
    }
  }

  async function handleSaveNote() {
    if (!selectedConsultationId || role !== "doctor") return;

    const created = await createClinicalNote(
      selectedConsultationId,
      {
        soap,
        patientSummary: noteSummary,
        status: "draft",
      },
      actor,
    );

    setNotes((prev) => [...prev, created]);
    setSoap(EMPTY_SOAP);
    setNoteSummary("");
  }

  async function handleFinaliseAndRelease(noteId: string) {
    if (!selectedConsultationId || role !== "doctor") return;

    const finalised = await updateClinicalNote(
      selectedConsultationId,
      noteId,
      { status: "final" },
      actor,
    );

    const released = await releaseClinicalNote(
      selectedConsultationId,
      noteId,
      actor,
    );

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, ...finalised, ...released } : n,
      ),
    );
  }

  if (loading) {
    return (
      <RoomShell>
        <div className="h-full grid place-items-center text-muted-foreground">
          Loading room workspace...
        </div>
      </RoomShell>
    );
  }

  if (error || !room) {
    return (
      <RoomShell>
        <div className="h-full grid place-items-center px-4">
          <div className="text-center space-y-3">
            <p className="text-red-600">{error ?? "Room not found."}</p>
            <Link
              to={
                role === "doctor"
                  ? "/doctor/telemedicine"
                  : "/patient/telemedicine"
              }
              className="inline-flex text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary"
            >
              Back to rooms
            </Link>
          </div>
        </div>
      </RoomShell>
    );
  }

  const doctorProfile = dummyDoctorProfile(room);
  const patientRecord = dummyPatientRecord(room);

  return (
    <RoomShell>
      <div className="h-full w-full max-w-475 mx-auto grid grid-rows-[auto,1fr] gap-3">
        <div className="bg-card border border-border rounded-xl h-14 px-3 flex items-center justify-between gap-2 overflow-hidden">
          <h1 className="text-base font-semibold text-foreground truncate min-w-0">
            Room Workspace {shortRoomId(room.id)}
          </h1>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 shrink-0">
            <CalendarClock className="w-3.5 h-3.5" /> Expires{" "}
            {formatDate(room.expiresAt)}
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] gap-3 h-full min-h-0">
          <aside className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
            <section className="bg-card border border-border rounded-xl p-3 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                  <Video className="w-4 h-4" /> Sessions
                </h2>
                {role === "doctor" && (
                  <button
                    type="button"
                    onClick={openCreateConsultationModal}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary inline-flex items-center gap-1"
                  >
                    <ClipboardPlus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>

              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 mt-3">
                {consultations.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No consultations mapped to this room yet.
                  </p>
                )}
                {consultations.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedConsultationId(session.id)}
                    className={`w-full text-left border rounded-xl p-3 transition-colors ${
                      selectedConsultationId === session.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        #{session.id.slice(-6)}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${statusPill(session.status)}`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDate(session.startsAt)}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-3 h-full min-h-0 overflow-y-auto">
              {role === "doctor" ? (
                <>
                  <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Patient Record
                  </h2>
                  <div className="text-xs space-y-1.5 rounded-xl border border-border p-3 bg-background/70 mt-3">
                    <p>
                      <span className="text-muted-foreground">Patient ID:</span>{" "}
                      {patientRecord.displayId}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Age band:</span>{" "}
                      {patientRecord.ageBand}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Blood group:
                      </span>{" "}
                      {patientRecord.bloodGroup}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Allergies:</span>{" "}
                      {patientRecord.allergies}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Chronic:</span>{" "}
                      {patientRecord.chronic}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Triage:</span>{" "}
                      {patientRecord.triage}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border p-3 bg-background/70 space-y-2 mt-3">
                    <h3 className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Clinical Notes
                    </h3>
                    {!selectedConsultation && (
                      <p className="text-xs text-muted-foreground">
                        Select consultation to manage notes.
                      </p>
                    )}
                    {selectedConsultation && (
                      <>
                        <textarea
                          rows={2}
                          value={soap.subjective.chiefComplaint}
                          onChange={(e) =>
                            setSoap((prev) => ({
                              ...prev,
                              subjective: {
                                ...prev.subjective,
                                chiefComplaint: e.target.value,
                              },
                            }))
                          }
                          placeholder="Chief complaint"
                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
                        />
                        <textarea
                          rows={2}
                          value={soap.assessment.diagnosis}
                          onChange={(e) =>
                            setSoap((prev) => ({
                              ...prev,
                              assessment: {
                                ...prev.assessment,
                                diagnosis: e.target.value,
                              },
                            }))
                          }
                          placeholder="Diagnosis"
                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
                        />
                        <textarea
                          rows={2}
                          value={soap.plan.treatmentPlan}
                          onChange={(e) =>
                            setSoap((prev) => ({
                              ...prev,
                              plan: {
                                ...prev.plan,
                                treatmentPlan: e.target.value,
                              },
                            }))
                          }
                          placeholder="Treatment plan"
                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
                        />
                        <input
                          value={noteSummary}
                          onChange={(e) => setNoteSummary(e.target.value)}
                          placeholder="Patient summary"
                          className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveNote()}
                          className="w-full text-xs px-2.5 py-2 rounded-lg bg-primary text-primary-foreground"
                        >
                          Save Draft Note
                        </button>
                        <div className="space-y-2 max-h-44 overflow-y-auto">
                          {notes.map((n) => (
                            <div
                              key={n.id}
                              className="border border-border rounded-lg p-2"
                            >
                              <p className="text-[11px] text-muted-foreground">
                                {n.status} • {formatDate(n.createdAt)}
                              </p>
                              <p className="text-xs text-foreground mt-0.5">
                                {n.soap.assessment.diagnosis || "No diagnosis"}
                              </p>
                              {n.status !== "final" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleFinaliseAndRelease(n.id)
                                  }
                                  className="mt-1.5 text-[11px] px-2 py-1 rounded border border-border hover:bg-secondary"
                                >
                                  Finalise + Release
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4" /> Doctor Profile
                  </h2>
                  <div className="text-xs space-y-1.5 rounded-xl border border-border p-3 bg-background/70 mt-3">
                    <p>
                      <span className="text-muted-foreground">Doctor:</span>{" "}
                      {doctorProfile.name}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Code:</span>{" "}
                      {doctorProfile.displayId}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Specialty:</span>{" "}
                      {doctorProfile.specialty}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Qualification:
                      </span>{" "}
                      {doctorProfile.qualification}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Languages:</span>{" "}
                      {doctorProfile.languages}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Care tip:</span>{" "}
                      {doctorProfile.careTip}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border p-3 bg-background/70 space-y-2 mt-3">
                    <h3 className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> My Released Notes
                    </h3>
                    {!selectedConsultation && (
                      <p className="text-xs text-muted-foreground">
                        Select consultation to view notes.
                      </p>
                    )}
                    {selectedConsultation && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notes.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No released notes yet.
                          </p>
                        )}
                        {notes.map((n) => (
                          <div
                            key={n.id}
                            className="border border-border rounded-lg p-2"
                          >
                            <p className="text-[11px] text-muted-foreground">
                              {formatDate(n.createdAt)}
                            </p>
                            <p className="text-xs text-foreground mt-0.5">
                              {n.patientSummary ?? n.soap.plan.treatmentPlan}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </aside>

          <section className="bg-card border border-border rounded-xl p-3 flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
              <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Consultation Workspace
              </h2>
              {selectedConsultation && role === "doctor" && (
                <div className="flex gap-2">
                  {selectedConsultation.status === "scheduled" && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleStartConsultation(selectedConsultation.id)
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                  )}
                  {selectedConsultation.status === "active" && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleEndConsultation(selectedConsultation.id)
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> End
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
              <div className="border border-border rounded-xl overflow-hidden bg-background flex-1 min-h-0">
                {!selectedConsultation && (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground">
                    Pick a consultation to open workspace view.
                  </div>
                )}

                {selectedConsultation && !canOpenVideo && (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground px-6 text-center">
                    Patient can join only after doctor starts the consultation.
                  </div>
                )}

                {selectedConsultation && canOpenVideo && (
                  <iframe
                    src={room.jitsiRoomUrl}
                    className="w-full h-full border-0"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    title="Embedded telemedicine call"
                  />
                )}
              </div>

              <div className="border border-border rounded-xl bg-background p-3 flex flex-col h-65 shrink-0">
                <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5 mb-2">
                  <MessageSquare className="w-4 h-4" /> Chat
                </h3>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pb-2">
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No messages yet.
                    </p>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-xl border px-3 py-2 ${
                          m.senderId === userId
                            ? "bg-primary/10 border-primary/20"
                            : "bg-card border-border"
                        }`}
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {m.senderRole === "doctor" ? "Doctor" : "Patient"} •{" "}
                          {formatDate(m.createdAt)}
                        </p>
                        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-all">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="pt-2 border-t border-border mt-1">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Type a message"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!chatInput.trim()}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {createModalOpen && role === "doctor" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] grid place-items-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Schedule New Consultation
              </h3>
              <button
                type="button"
                onClick={closeCreateConsultationModal}
                disabled={creatingConsultation}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Date
                </label>
                <input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Time
                </label>
                <input
                  type="time"
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
                />
              </div>

              {createModalError && (
                <p className="text-xs text-red-600">{createModalError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeCreateConsultationModal}
                  disabled={creatingConsultation}
                  className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateConsultation()}
                  disabled={creatingConsultation}
                  className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {creatingConsultation ? "Creating..." : "Create Consultation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RoomShell>
  );
}
