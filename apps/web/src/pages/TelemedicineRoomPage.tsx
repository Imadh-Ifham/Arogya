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
import { useAppSelector } from "../app/hooks";
import { Activity, CalendarClock } from "lucide-react";
import ChatPanel from "../modules/telemedicine/components/chat/ChatPanel";
import ClinicalNotesPanel from "../modules/telemedicine/components/notes/ClinicalNotesPanel";
import DoctorProfileCard from "../modules/telemedicine/components/Profile/DoctorProfileCard";
import PatientRecordCard from "../modules/telemedicine/components/Profile/PatientRecordCard";
import CreateConsultationModal from "../modules/telemedicine/components/session/CreateConsultationModal";
import SessionControls from "../modules/telemedicine/components/session/SessionControls";
import SessionList from "../modules/telemedicine/components/session/SessionList";
import VideoPanel from "../modules/telemedicine/components/video/VideoPanel";

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
  const { user, accessToken } = useAppSelector((state) => state.auth);

  const role: Role = pathname.startsWith("/doctor/") ? "doctor" : "patient";
  const userRole = user?.role;
  const userId = user?._id;
  const isAuthenticated = Boolean(accessToken);
  const isAuthorizedRole = userRole === "doctor" || userRole === "patient";
  const hasAccess =
    isAuthenticated && isAuthorizedRole && userRole === role && Boolean(userId);
  const actor: TelemedicineActorContext | undefined = useMemo(
    () => (hasAccess && userId ? { id: userId, role } : undefined),
    [hasAccess, role, userId],
  );
  const fallbackPath = useMemo(() => {
    if (!userRole) return "/";
    if (userRole === "doctor") return "/doctor/telemedicine";
    if (userRole === "patient") return "/patient/telemedicine";
    return "/";
  }, [userRole]);

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
  const chatUserId = actor?.id ?? "";

  const selectedConsultation = useMemo(
    () => consultations.find((c) => c.id === selectedConsultationId) ?? null,
    [consultations, selectedConsultationId],
  );

  const canOpenVideo =
    !!selectedConsultation &&
    (role === "doctor" || selectedConsultation.status === "active");

  async function reloadRoomData() {
    if (!roomId || !userId || !actor) return;

    const loadedRoom = await fetchRoomById(roomId, actor);
    setRoom(loadedRoom);

    const allConsultations =
      role === "doctor"
        ? await fetchDoctorConsultations(userId, actor)
        : await fetchPatientConsultations(userId, actor);

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

    if (!hasAccess || !userId || !actor) {
      if (!isAuthenticated) {
        setError("Please log in to view this room.");
      } else if (!isAuthorizedRole) {
        setError("Telemedicine is only available for patients and doctors.");
      } else if (userRole !== role) {
        setError("You do not have access to this telemedicine view.");
      } else {
        setError("User profile not loaded yet.");
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    reloadRoomData()
      .catch(() => setError("Failed to load room workspace."))
      .finally(() => setLoading(false));
  }, [
    roomId,
    actor,
    hasAccess,
    isAuthenticated,
    isAuthorizedRole,
    role,
    userId,
    userRole,
  ]);

  useEffect(() => {
    if (!roomId || !actor) return;

    fetchChatMessages(roomId, undefined, 50, actor)
      .then(setMessages)
      .catch(() => undefined);

    const timer = window.setInterval(() => {
      fetchChatMessages(roomId, undefined, 50, actor)
        .then(setMessages)
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [roomId, actor]);

  useEffect(() => {
    if (!selectedConsultationId || !actor) {
      setNotes([]);
      return;
    }

    fetchClinicalNotes(selectedConsultationId, actor)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [selectedConsultationId, actor]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!roomId || !chatInput.trim() || !actor) return;

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
    if (!actor) return;
    const updated = await updateConsultationStatus(id, "active", actor);
    setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleEndConsultation(id: string) {
    if (!actor) return;
    const updated = await updateConsultationStatus(id, "ended", actor);
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
    if (!room || !actor) return;

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
      const created = await createConsultation(
        {
          appointmentId,
          doctorId: room.doctorId,
          patientId: room.patientId,
          startsAt: startsAt.toISOString(),
          expirationHours: 2,
        },
        actor,
      );

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
    if (!selectedConsultationId || role !== "doctor" || !actor) return;

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
    if (!selectedConsultationId || role !== "doctor" || !actor) return;

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
              to={fallbackPath}
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
            <SessionList
              consultations={consultations}
              selectedConsultationId={selectedConsultationId}
              onSelect={setSelectedConsultationId}
              onAdd={openCreateConsultationModal}
              role={role}
              statusPill={statusPill}
              formatDate={formatDate}
            />

            <section className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0 overflow-y-auto">
              {role === "doctor" ? (
                <>
                  <PatientRecordCard record={patientRecord} />
                  <ClinicalNotesPanel
                    variant="doctor"
                    selectedConsultation={selectedConsultation}
                    notes={notes}
                    soap={soap}
                    noteSummary={noteSummary}
                    onSoapChange={setSoap}
                    onNoteSummaryChange={setNoteSummary}
                    onSaveDraft={() => void handleSaveNote()}
                    onFinalise={(noteId) =>
                      void handleFinaliseAndRelease(noteId)
                    }
                    formatDate={formatDate}
                  />
                </>
              ) : (
                <>
                  <DoctorProfileCard profile={doctorProfile} />
                  <ClinicalNotesPanel
                    variant="patient"
                    selectedConsultation={selectedConsultation}
                    notes={notes}
                    formatDate={formatDate}
                  />
                </>
              )}
            </section>
          </aside>

          <section className="bg-card border border-border rounded-xl p-3 flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
              <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Consultation Workspace
              </h2>
              <SessionControls
                selectedConsultation={selectedConsultation}
                role={role}
                onStart={(id) => void handleStartConsultation(id)}
                onEnd={(id) => void handleEndConsultation(id)}
              />
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 overflow-hidden">
              {/* Video Section */}
              <div className="border border-border rounded-xl overflow-hidden bg-background min-h-0">
                <VideoPanel
                  selectedConsultation={selectedConsultation}
                  canOpenVideo={canOpenVideo}
                  roomUrl={room.jitsiRoomUrl}
                />
              </div>

              {/* Chat Section */}
              <div className="min-h-0 flex flex-col border border-border rounded-xl overflow-hidden">
                <ChatPanel
                  messages={messages}
                  userId={chatUserId}
                  chatInput={chatInput}
                  onChatInputChange={setChatInput}
                  onSend={() => void handleSendMessage()}
                  formatDate={formatDate}
                  chatEndRef={chatEndRef}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
      <CreateConsultationModal
        open={createModalOpen}
        role={role}
        createDate={createDate}
        createTime={createTime}
        creatingConsultation={creatingConsultation}
        createModalError={createModalError}
        onDateChange={setCreateDate}
        onTimeChange={setCreateTime}
        onClose={closeCreateConsultationModal}
        onCreate={() => void handleCreateConsultation()}
      />
    </RoomShell>
  );
}
