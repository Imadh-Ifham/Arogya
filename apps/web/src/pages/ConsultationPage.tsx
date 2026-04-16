import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { fetchAppointment } from "../modules/appointment/api/rest";
import { completeAppointmentThunk } from "../store/appointment/appointment.thunk";
import type { Appointment } from "../modules/appointment/api/rest";
import {
  fetchConsultationByAppointment,
  createConsultation,
  updateConsultationStatus,
  fetchChatMessages,
  sendChatMessageRest,
  fetchClinicalNotes,
  createClinicalNote,
  updateClinicalNote,
  releaseClinicalNote,
} from "../modules/telemedicine/api/rest";
import type {
  ConsultationView,
  ChatMessage,
  ClinicalNote,
  SoapNote,
  ConsultationStatus,
} from "../modules/telemedicine/api/rest";
import {
  getSocket,
  disconnectSocket,
  joinChatRoom,
  emitChatMessage,
  CHAT_EVENTS,
} from "../modules/telemedicine/api/socket";
import type { ChatSocketEventResult, SafetyFlagEvent } from "../modules/telemedicine/api/socket";
import {
  ArrowLeft,
  Video,
  VideoOff,
  ExternalLink,
  PhoneOff,
  Play,
  MessageSquare,
  FileText,
  WifiOff,
  Wifi,
  AlertTriangle,
  Phone,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";
type ActivePanel = "chat" | "notes";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ConsultationStatus, string> = {
  scheduled: "bg-amber-100 text-amber-700 border-amber-200",
  active:    "bg-green-100 text-green-700 border-green-200",
  ended:     "bg-gray-100  text-gray-600  border-gray-200",
  cancelled: "bg-red-100   text-red-600   border-red-200",
};

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  scheduled: "Scheduled",
  active:    "In Progress",
  ended:     "Ended",
  cancelled: "Cancelled",
};

const CONN_CONFIG: Record<ConnectionStatus, { dot: string; label: string }> = {
  connecting:   { dot: "bg-amber-400 animate-pulse", label: "Connecting…" },
  connected:    { dot: "bg-green-500",               label: "Connected" },
  reconnecting: { dot: "bg-orange-400 animate-pulse", label: "Reconnecting…" },
  offline:      { dot: "bg-red-500",                 label: "Offline" },
};

// ─── Empty SOAP template ──────────────────────────────────────────────────────

const EMPTY_SOAP: SoapNote = {
  subjective: { chiefComplaint: "" },
  assessment: { diagnosis: "" },
  plan: { treatmentPlan: "" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConsentCheckpoint({ onAccept, role }: { onAccept: () => void; role: "doctor" | "patient" }) {
  return (
    <div className="flex h-full items-center justify-center p-6 bg-background">
      <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
            <Shield className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Before you join</h2>
            <p className="text-xs text-muted-foreground">Review and acknowledge the terms</p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <span>This consultation is private and secure. Audio and video are not recorded by the platform.</span>
          </li>
          {role === "doctor" ? (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <span>Clinical notes you write remain confidential until you release them to the patient.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <span>Only start the session when both you and the patient are ready.</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <span>Your health data shared during this session is protected under our Privacy Policy.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <span>If you experience a medical emergency, call emergency services immediately.</span>
              </li>
            </>
          )}
        </ul>

        <button
          onClick={onAccept}
          className="w-full bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          I understand — Join Session
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const role = user?.role === "doctor" ? "doctor" : "patient";
  const userId = user?._id ?? "";

  // ── Page bootstrap state
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [consultation, setConsultation] = useState<ConsultationView | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Consent gate
  const [consentGiven, setConsentGiven] = useState(false);

  // ── Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [escalation, setEscalation] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [roomJoinError, setRoomJoinError] = useState<string | null>(null);
  const roomJoinedRef = useRef(false);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // ── Clinical notes (doctor)
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [noteSoap, setNoteSoap] = useState<SoapNote>(EMPTY_SOAP);
  const [notePatientSummary, setNotePatientSummary] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // ── UI layout
  const [showVideo, setShowVideo] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !userId) return;

    (async () => {
      try {
        const apt = await fetchAppointment(id);

        if (apt.appointmentType !== "ONLINE") {
          setPageError("This appointment is not an online consultation.");
          setLoading(false);
          return;
        }
        if (apt.status !== "ACCEPTED" && apt.status !== "CONFIRMED") {
          setPageError(
            `Consultation not available yet. Appointment status: ${apt.status}. The doctor must accept the appointment first.`,
          );
          setLoading(false);
          return;
        }
        setAppointment(apt);

        let consult = await fetchConsultationByAppointment(id, role, userId);

        if (!consult && role === "doctor") {
          consult = await createConsultation({
            appointmentId: id,
            patientId: apt.patientId,
            doctorId: apt.doctorId,
            startsAt: new Date().toISOString(),
            expirationHours: 2,
          });
        }

        if (consult) {
          setConsultation(consult);

          // Load chat history — non-fatal if it fails (e.g. participant ID mismatch
          // or room not yet indexed). The page is still usable without history.
          try {
            const history = await fetchChatMessages(consult.room.id);
            setMessages(history);
          } catch {
            // silent — socket will sync messages on connect
          }

          if (consult.status === "ended" || role === "doctor") {
            try {
              const noteList = await fetchClinicalNotes(consult.id);
              setNotes(noteList);
            } catch {
              // silent — notes panel will show empty state
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[ConsultationPage] Bootstrap error:", msg, err);
        setPageError("Failed to load consultation. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, userId, role]);

  // ─── Patient polling (waiting for doctor to create the session) ──────────
  useEffect(() => {
    // Only poll when: patient, consent given, no consultation yet, page loaded
    if (role !== "patient" || !consentGiven || consultation || loading || !id || !userId) return;

    const interval = setInterval(async () => {
      try {
        const consult = await fetchConsultationByAppointment(id, role, userId);
        if (consult) {
          setConsultation(consult);
          const history = await fetchChatMessages(consult.room.id);
          setMessages(history);
          clearInterval(interval);
        }
      } catch { /* silent */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [role, consentGiven, consultation, loading, id, userId]);

  // ─── Socket.IO ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!consultation || !userId || !consentGiven) return;

    const socket = getSocket(userId, role);
    socketRef.current = socket;

    const joinRoom = () => {
      roomJoinedRef.current = false;
      joinChatRoom(
        socket,
        consultation.room.id,
        () => { roomJoinedRef.current = true; setRoomJoinError(null); },
        (msg) => { setRoomJoinError(msg); },
      );
    };

    const onConnect = () => {
      setConnection("connected");
      setReconnectAttempts(0);
      joinRoom();
    };

    const onDisconnect = () => { roomJoinedRef.current = false; setConnection("offline"); };

    const onReconnectAttempt = (attempt: number) => {
      setConnection("reconnecting");
      setReconnectAttempts(attempt);
    };

    const onReconnect = () => {
      setConnection("connected");
      setReconnectAttempts(0);
      // Re-join room and pull any missed messages
      joinRoom();
      fetchChatMessages(consultation.room.id).then(setMessages).catch(() => null);
    };

    const onNewMessage = (payload: ChatSocketEventResult) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
      if (payload.escalationGuidance) setEscalation(payload.escalationGuidance);
    };

    const onUpdated = (payload: ChatSocketEventResult) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.message.id ? payload.message : m)),
      );
    };

    const onDeleted = (payload: ChatSocketEventResult) => {
      setMessages((prev) => prev.filter((m) => m.id !== payload.message.id));
    };

    const onSafetyFlag = (payload: SafetyFlagEvent) => {
      setEscalation(payload.escalationGuidance);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect", onReconnect);
    socket.on(CHAT_EVENTS.NEW, onNewMessage);
    socket.on(CHAT_EVENTS.UPDATED, onUpdated);
    socket.on(CHAT_EVENTS.DELETED, onDeleted);
    socket.on(CHAT_EVENTS.SAFETY_FLAGGED, onSafetyFlag);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect", onReconnect);
      socket.off(CHAT_EVENTS.NEW, onNewMessage);
      socket.off(CHAT_EVENTS.UPDATED, onUpdated);
      socket.off(CHAT_EVENTS.DELETED, onDeleted);
      socket.off(CHAT_EVENTS.SAFETY_FLAGGED, onSafetyFlag);
    };
  }, [consultation, userId, role, consentGiven]);

  // Only disconnect when the full workspace unmounts (consentGiven=true).
  // Skipping disconnect on consent-gate unmount prevents killing the socket
  // before the workspace effect has a chance to attach its listeners.
  useEffect(() => {
    if (!consentGiven) return;
    return () => { disconnectSocket(); };
  }, [consentGiven]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !consultation) return;
    const content = chatInput.trim();
    setChatInput("");

    if (socketRef.current?.connected && roomJoinedRef.current) {
      // Fast path: send via socket with ack so the sender sees the message
      // immediately without waiting for the broadcast round-trip.
      socketRef.current.emit(
        "chat:message.send",
        { roomId: consultation.room.id, message: { content } },
        (ack: { success: boolean; data?: { message: ChatMessage; escalationGuidance?: string } }) => {
          if (ack?.success && ack.data) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === ack.data!.message.id)) return prev;
              return [...prev, ack.data!.message];
            });
            if (ack.data.escalationGuidance) setEscalation(ack.data.escalationGuidance);
          }
        },
      );
    } else {
      // Fallback: REST (socket not connected or room not joined yet)
      try {
        const result = await sendChatMessageRest(consultation.room.id, content);
        setMessages((prev) => {
          if (prev.find((m) => m.id === result.message.id)) return prev;
          return [...prev, result.message];
        });
        if (result.escalationGuidance) setEscalation(result.escalationGuidance);
      } catch { /* silent */ }
    }
  }, [chatInput, consultation]);

  const handleStatusChange = useCallback(
    async (status: ConsultationStatus) => {
      if (!consultation) return;
      try {
        const updated = await updateConsultationStatus(consultation.id, status, role);
        setConsultation(updated);
        if (status === "ended") {
          // Mark the linked appointment as COMPLETED in the appointment service
          if (id) {
            dispatch(completeAppointmentThunk(id));
          }
          if (role === "doctor") {
            const noteList = await fetchClinicalNotes(consultation.id);
            setNotes(noteList);
          }
        }
      } catch { /* silent */ }
    },
    [consultation, role, id, dispatch],
  );

  const handleSaveNote = useCallback(async () => {
    if (!consultation) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      if (editingNoteId) {
        const updated = await updateClinicalNote(consultation.id, editingNoteId, {
          soap: noteSoap,
          patientSummary: notePatientSummary,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? updated : n)));
      } else {
        const created = await createClinicalNote(consultation.id, {
          soap: noteSoap,
          patientSummary: notePatientSummary,
          status: "draft",
        });
        setNotes((prev) => [...prev, created]);
      }
      setNoteSoap(EMPTY_SOAP);
      setNotePatientSummary("");
      setEditingNoteId(null);
    } catch {
      setNoteError("Failed to save note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  }, [consultation, editingNoteId, noteSoap, notePatientSummary]);

  const handleFinaliseNote = useCallback(
    async (noteId: string) => {
      if (!consultation) return;
      try {
        const updated = await updateClinicalNote(consultation.id, noteId, { status: "final" });
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      } catch { /* silent */ }
    },
    [consultation],
  );

  const handleReleaseNote = useCallback(
    async (noteId: string) => {
      if (!consultation) return;
      try {
        const updated = await releaseClinicalNote(consultation.id, noteId);
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      } catch { /* silent */ }
    },
    [consultation],
  );

  // ─── Early returns ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Setting up your consultation…</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {pageError}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  // ── Consent gate (shown after page loads, before workspace)
  if (!consentGiven) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Minimal top bar */}
        <div className="shrink-0 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm font-semibold text-foreground">Video Consultation</span>
        </div>
        <ConsentCheckpoint onAccept={() => setConsentGiven(true)} role={role} />
      </div>
    );
  }

  const consultStatus = consultation?.status ?? "scheduled";
  const isEnded = consultStatus === "ended" || consultStatus === "cancelled";
  // Only block chat when offline or session ended — allow typing while connecting/reconnecting
  const chatDisabled = connection === "offline" || isEnded;
  const connInfo = CONN_CONFIG[connection];

  // Patient has no consultation record yet (doctor hasn't created session)
  const patientWaiting = !consultation && role === "patient";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-card border-b border-border px-4 py-2.5 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground hidden sm:block">
            Video Consultation
          </span>
          {consultation && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLOR[consultStatus]}`}>
              {STATUS_LABEL[consultStatus]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Video toggle */}
          <button
            onClick={() => setShowVideo((v) => !v)}
            title={showVideo ? "Hide video" : "Show video"}
            className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            {showVideo ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Doctor: Start session */}
          {role === "doctor" && consultation && consultStatus === "scheduled" && (
            <button
              onClick={() => handleStatusChange("active")}
              className="flex items-center gap-1.5 text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 transition-colors font-medium"
            >
              <Play className="w-3.5 h-3.5" /> Start Session
            </button>
          )}

          {/* Doctor: End session */}
          {role === "doctor" && consultation && consultStatus === "active" && (
            <button
              onClick={() => handleStatusChange("ended")}
              className="flex items-center gap-1.5 text-xs bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 transition-colors font-medium"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End Session
            </button>
          )}

          {/* Open in new tab */}
          {consultation?.room.jitsiRoomUrl && (
          <a
            href={consultation.room.jitsiRoomUrl}
            target="_blank"
            rel="noreferrer"
            title="Open Jitsi in new tab"
            className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors hidden sm:flex"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          )}
        </div>
      </div>

      {/* ── Reconnect banner ─────────────────────────────────────────────── */}
      {(connection === "offline" || connection === "reconnecting") && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            {connection === "reconnecting"
              ? `Reconnecting… (attempt ${reconnectAttempts})`
              : "Disconnected from chat. Check your internet connection."}
          </p>
        </div>
      )}

      {/* ── Room join error banner ───────────────────────────────────────── */}
      {roomJoinError && (
        <div className="shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">Chat unavailable: {roomJoinError}</p>
        </div>
      )}

      {/* ── Safety alert banner ──────────────────────────────────────────── */}
      {escalation && (
        <div className="shrink-0 bg-red-50 border-b border-red-300 px-4 py-2 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Safety Alert</p>
              <p className="text-xs text-red-600 mt-0.5">{escalation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:1926"
              className="flex items-center gap-1 text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Phone className="w-3 h-3" /> Emergency
            </a>
            <button
              onClick={() => setEscalation(null)}
              className="text-red-500 text-xs hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Patient waiting banner ───────────────────────────────────────── */}
      {patientWaiting && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
          <Wifi className="w-4 h-4 shrink-0" />
          Waiting for the doctor to start the session. Your video room is ready.
        </div>
      )}

      {/* ── Post-consult banner ──────────────────────────────────────────── */}
      {isEnded && (
        <div className="shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-gray-500 shrink-0" />
          {consultStatus === "cancelled"
            ? "This consultation was cancelled."
            : "Consultation ended. Chat history and clinical notes are read-only."}
        </div>
      )}

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Jitsi panel ──────────────────────────────────────────────── */}
        {showVideo && !isEnded && consultation?.room.jitsiRoomUrl && (
          <div className="flex flex-col flex-1">
            <iframe
              src={consultation.room.jitsiRoomUrl}
              className="flex-1 w-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              title="Video consultation room"
            />
          </div>
        )}

        {showVideo && !isEnded && !consultation?.room.jitsiRoomUrl && (
          <div className="flex flex-col flex-1 items-center justify-center bg-gray-900 text-white gap-3">
            <Video className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-400">Video room is being prepared…</p>
          </div>
        )}

        {/* Post-consult video placeholder */}
        {showVideo && isEnded && (
          <div className="flex flex-col flex-1 items-center justify-center bg-gray-900 text-white gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">
              {consultStatus === "cancelled" ? "Session was cancelled." : "Session has ended."}
            </p>
          </div>
        )}

        {/* ── Right panel: Chat + Notes ─────────────────────────────── */}
        {(consultation || patientWaiting) && (
          <div
            className={`flex flex-col border-l border-border bg-card ${
              showVideo ? "w-80 shrink-0" : "flex-1"
            }`}
          >
            {/* Panel tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setActivePanel("chat")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activePanel === "chat"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>

              {/* Doctor always sees notes tab */}
              {role === "doctor" && consultation && (
                <button
                  onClick={() => setActivePanel("notes")}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    activePanel === "notes"
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Notes{notes.length > 0 ? ` (${notes.length})` : ""}
                </button>
              )}

              {/* Patient sees notes tab only after consultation ends and notes are released */}
              {role === "patient" &&
                consultStatus === "ended" &&
                notes.filter((n) => n.status === "final" && n.releasedToPatientAt).length > 0 && (
                  <button
                    onClick={() => setActivePanel("notes")}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      activePanel === "notes"
                        ? "text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    My Notes
                  </button>
                )}
            </div>

            {/* ── Chat panel ─────────────────────────────────────────── */}
            {activePanel === "chat" && (
              <>
                {/* Connection indicator */}
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-border/50 bg-background/40">
                  <span className={`w-1.5 h-1.5 rounded-full ${connInfo.dot}`} />
                  <span className="text-xs text-muted-foreground">{connInfo.label}</span>
                  {messages.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground/60">
                      {messages.length} message{messages.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Message timeline */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground text-center">
                        No messages yet.{!isEnded && " Say hello!"}
                      </p>
                    </div>
                  )}

                  {/* Group messages by date */}
                  {messages.map((msg, idx) => {
                    const isMe = msg.senderId === userId;
                    const prevMsg = messages[idx - 1];
                    const showDate =
                      !prevMsg || dateLabel(msg.createdAt) !== dateLabel(prevMsg.createdAt);

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-2 py-1">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-muted-foreground px-2">
                              {dateLabel(msg.createdAt)}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}

                        <div className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                          {/* Safety flag */}
                          {msg.safetyFlags.length > 0 && (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1 max-w-[90%] flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                              {msg.safetyFlags[0].guidance}
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              isMe
                                ? "bg-teal-600 text-white rounded-br-sm"
                                : "bg-secondary text-foreground rounded-bl-sm"
                            }`}
                          >
                            {msg.content}
                          </div>

                          <span className="text-[10px] text-muted-foreground">
                            {msg.senderRole === "doctor" ? "Dr." : "Patient"} · {timeLabel(msg.createdAt)}
                            {msg.editedAt && " · edited"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Composer */}
                {isEnded ? (
                  <div className="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground text-center bg-background/40">
                    Chat is read-only after session ends.
                  </div>
                ) : (
                  <div className="shrink-0 border-t border-border p-2 flex gap-2 bg-card">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder={connection === "offline" ? "Disconnected…" : "Type a message…"}
                      className="flex-1 border border-border bg-input-background text-foreground rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      disabled={chatDisabled}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!chatInput.trim() || chatDisabled}
                      className="bg-teal-600 text-white rounded-xl px-3 py-1.5 hover:bg-teal-700 disabled:opacity-40 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Clinical Notes panel (Doctor) ───────────────────── */}
            {activePanel === "notes" && role === "doctor" && consultation && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {/* Note form */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {editingNoteId ? "Edit SOAP Note" : "New SOAP Note"}
                  </h3>

                  <textarea
                    rows={2}
                    placeholder="Chief complaint (Subjective) *"
                    value={noteSoap.subjective.chiefComplaint}
                    onChange={(e) =>
                      setNoteSoap((prev) => ({
                        ...prev,
                        subjective: { ...prev.subjective, chiefComplaint: e.target.value },
                      }))
                    }
                    className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />

                  <textarea
                    rows={2}
                    placeholder="Vitals / Physical exam (Objective)"
                    value={noteSoap.objective?.vitals ?? ""}
                    onChange={(e) =>
                      setNoteSoap((prev) => ({
                        ...prev,
                        objective: { ...prev.objective, vitals: e.target.value },
                      }))
                    }
                    className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />

                  <textarea
                    rows={2}
                    placeholder="Diagnosis (Assessment) *"
                    value={noteSoap.assessment.diagnosis}
                    onChange={(e) =>
                      setNoteSoap((prev) => ({
                        ...prev,
                        assessment: { ...prev.assessment, diagnosis: e.target.value },
                      }))
                    }
                    className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />

                  <textarea
                    rows={2}
                    placeholder="Treatment plan (Plan) *"
                    value={noteSoap.plan.treatmentPlan}
                    onChange={(e) =>
                      setNoteSoap((prev) => ({
                        ...prev,
                        plan: { ...prev.plan, treatmentPlan: e.target.value },
                      }))
                    }
                    className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />

                  <textarea
                    rows={2}
                    placeholder="Patient summary (shown to patient after release)"
                    value={notePatientSummary}
                    onChange={(e) => setNotePatientSummary(e.target.value)}
                    className="w-full border border-border bg-input-background text-foreground rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />

                  {noteError && (
                    <p className="text-xs text-red-600">{noteError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNote}
                      disabled={
                        savingNote ||
                        !noteSoap.subjective.chiefComplaint ||
                        !noteSoap.assessment.diagnosis ||
                        !noteSoap.plan.treatmentPlan
                      }
                      className="flex-1 bg-primary text-primary-foreground text-xs py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {savingNote ? "Saving…" : editingNoteId ? "Update Note" : "Save Draft"}
                    </button>
                    {editingNoteId && (
                      <button
                        onClick={() => {
                          setEditingNoteId(null);
                          setNoteSoap(EMPTY_SOAP);
                          setNotePatientSummary("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground px-2"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Saved notes list */}
                {notes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Saved Notes ({notes.length})
                    </h3>
                    {notes.map((note) => {
                      const isExpanded = expandedNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          className="border border-border rounded-xl overflow-hidden"
                        >
                          {/* Note header */}
                          <button
                            onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-background/60 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  note.status === "final"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {note.status}
                              </span>
                              {note.releasedToPatientAt && (
                                <span className="text-[10px] text-teal-600">released</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {timeLabel(note.createdAt)}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>

                          {/* Note body */}
                          {isExpanded && (
                            <div className="px-3 py-2 space-y-1.5 text-xs border-t border-border/50">
                              <p className="font-medium text-foreground">
                                {note.soap.subjective.chiefComplaint}
                              </p>
                              <p className="text-muted-foreground">
                                <span className="font-medium">Dx:</span> {note.soap.assessment.diagnosis}
                              </p>
                              <p className="text-muted-foreground">
                                <span className="font-medium">Plan:</span> {note.soap.plan.treatmentPlan}
                              </p>
                              {note.patientSummary && (
                                <p className="text-muted-foreground italic">
                                  Summary: {note.patientSummary}
                                </p>
                              )}

                              <div className="flex gap-1.5 pt-1 flex-wrap">
                                {note.status === "draft" && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setNoteSoap(note.soap);
                                        setNotePatientSummary(note.patientSummary ?? "");
                                      }}
                                      className="text-[10px] border border-border rounded px-2 py-0.5 hover:bg-secondary"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleFinaliseNote(note.id)}
                                      className="text-[10px] bg-green-600 text-white rounded px-2 py-0.5 hover:bg-green-700"
                                    >
                                      Finalise
                                    </button>
                                  </>
                                )}
                                {note.status === "final" && !note.releasedToPatientAt && (
                                  <button
                                    onClick={() => handleReleaseNote(note.id)}
                                    className="text-[10px] bg-teal-600 text-white rounded px-2 py-0.5 hover:bg-teal-700"
                                  >
                                    Release to patient
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Clinical Notes panel (Patient — post-consult) ────── */}
            {activePanel === "notes" && role === "patient" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clinical Notes from Doctor
                </h3>

                {notes.filter((n) => n.status === "final" && n.releasedToPatientAt).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <FileText className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground text-center">
                      No notes have been released yet.
                    </p>
                  </div>
                ) : (
                  notes
                    .filter((n) => n.status === "final" && n.releasedToPatientAt)
                    .map((note) => (
                      <div
                        key={note.id}
                        className="border border-border rounded-xl p-3 space-y-2 text-sm"
                      >
                        {note.patientSummary && (
                          <p className="text-foreground font-medium">{note.patientSummary}</p>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1 border-t border-border/50 pt-2">
                          <p><span className="font-medium">Complaint:</span> {note.soap.subjective.chiefComplaint}</p>
                          <p><span className="font-medium">Diagnosis:</span> {note.soap.assessment.diagnosis}</p>
                          <p><span className="font-medium">Plan:</span> {note.soap.plan.treatmentPlan}</p>
                          {note.soap.plan.medications && (
                            <p><span className="font-medium">Medications:</span> {note.soap.plan.medications}</p>
                          )}
                          {note.soap.plan.followUpInstructions && (
                            <p><span className="font-medium">Follow-up:</span> {note.soap.plan.followUpInstructions}</p>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Released {dateLabel(note.releasedToPatientAt!)}
                        </p>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ── Patient pre-consult notes placeholder ────────────── */}
            {activePanel === "notes" && role === "patient" && consultStatus !== "ended" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-2">
                <FileText className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground text-center">
                  Clinical notes will be available after the consultation ends and the doctor releases them.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
