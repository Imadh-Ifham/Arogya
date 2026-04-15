import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { useAppSelector } from "../app/hooks";
import { fetchAppointment } from "../modules/appointment/api/rest";
import type { Appointment } from "../modules/appointment/api/rest";
import {
  fetchConsultationByAppointment,
  createConsultation,
  updateConsultationStatus,
  fetchChatMessages,
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

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ConsultationStatus, string> = {
  scheduled: "bg-amber-100 text-amber-700",
  active:    "bg-green-100 text-green-700",
  ended:     "bg-gray-100  text-gray-600",
  cancelled: "bg-red-100   text-red-600",
};

// ─── Empty SOAP template ──────────────────────────────────────────────────────
const EMPTY_SOAP: SoapNote = {
  subjective: { chiefComplaint: "" },
  assessment: { diagnosis: "" },
  plan: { treatmentPlan: "" },
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const role = user?.role === "doctor" ? "doctor" : "patient";
  const userId = user?._id ?? "";

  // Core state
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [consultation, setConsultation] = useState<ConsultationView | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [escalation, setEscalation] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Clinical notes state (doctor only)
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [noteSoap, setNoteSoap] = useState<SoapNote>(EMPTY_SOAP);
  const [notePatientSummary, setNotePatientSummary] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Jitsi panel toggle
  const [showVideo, setShowVideo] = useState(true);

  // ─── Bootstrap: fetch appointment + consultation ───────────────────────────
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
            `Consultation not available yet. Status: ${apt.status}. The doctor must accept the appointment first.`,
          );
          setLoading(false);
          return;
        }
        if (!apt.meetingUrl) {
          setPageError("Meeting room not set up yet. Please contact support.");
          setLoading(false);
          return;
        }
        setAppointment(apt);

        // Try to find existing consultation record
        let consult = await fetchConsultationByAppointment(id, role, userId);

        // Doctor creates the consultation session if it doesn't exist yet
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

          // Fetch chat history
          const history = await fetchChatMessages(consult.room.id);
          setMessages(history);

          // Fetch notes (doctor sees drafts + finals; patient sees only released finals)
          if (consult.status === "ended" || role === "doctor") {
            const noteList = await fetchClinicalNotes(consult.id);
            setNotes(noteList);
          }
        }
      } catch (err) {
        setPageError("Failed to load consultation. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, userId, role]);

  // ─── Socket.IO setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!consultation || !userId) return;

    const socket = getSocket(userId, role);
    socketRef.current = socket;

    const onConnect = () => {
      setSocketReady(true);
      joinChatRoom(socket, consultation.room.id);
    };

    const onDisconnect = () => setSocketReady(false);

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
    socket.on(CHAT_EVENTS.NEW, onNewMessage);
    socket.on(CHAT_EVENTS.UPDATED, onUpdated);
    socket.on(CHAT_EVENTS.DELETED, onDeleted);
    socket.on(CHAT_EVENTS.SAFETY_FLAGGED, onSafetyFlag);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(CHAT_EVENTS.NEW, onNewMessage);
      socket.off(CHAT_EVENTS.UPDATED, onUpdated);
      socket.off(CHAT_EVENTS.DELETED, onDeleted);
      socket.off(CHAT_EVENTS.SAFETY_FLAGGED, onSafetyFlag);
    };
  }, [consultation, userId, role]);

  // Disconnect on unmount
  useEffect(() => () => { disconnectSocket(); }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !consultation) return;
    if (socketRef.current && socketReady) {
      emitChatMessage(socketRef.current, consultation.room.id, chatInput.trim());
    }
    setChatInput("");
  }, [chatInput, consultation, socketReady]);

  const handleStatusChange = useCallback(
    async (status: ConsultationStatus) => {
      if (!consultation) return;
      try {
        const updated = await updateConsultationStatus(consultation.id, status);
        setConsultation(updated);
        if (status === "ended" && role === "doctor") {
          const noteList = await fetchClinicalNotes(consultation.id);
          setNotes(noteList);
        }
      } catch {
        /* silent */
      }
    },
    [consultation, role],
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
      setNoteError("Failed to save note.");
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
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading consultation…
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            {pageError}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  const roomId = consultation?.room.id;
  const consultStatus = consultation?.status ?? "scheduled";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 bg-card border-b border-border px-4 py-2 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground hidden sm:block">
            Video Consultation
          </span>
          {consultation && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[consultStatus]}`}
            >
              {consultStatus}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Video toggle */}
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="text-xs border border-border rounded px-2 py-1 hover:bg-secondary transition-colors"
          >
            {showVideo ? "Hide video" : "Show video"}
          </button>

          {/* Doctor controls */}
          {role === "doctor" && consultation && consultStatus === "scheduled" && (
            <button
              onClick={() => handleStatusChange("active")}
              className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 transition-colors"
            >
              Start session
            </button>
          )}
          {role === "doctor" && consultation && consultStatus === "active" && (
            <button
              onClick={() => handleStatusChange("ended")}
              className="text-xs bg-red-600 text-white rounded px-3 py-1 hover:bg-red-700 transition-colors"
            >
              End session
            </button>
          )}

          {/* Notes toggle (doctor) */}
          {role === "doctor" && consultation && (
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="text-xs border border-border rounded px-2 py-1 hover:bg-secondary transition-colors"
            >
              {showNotes ? "Hide notes" : "Clinical notes"}
            </button>
          )}

          {/* Open Jitsi in new tab */}
          <a
            href={appointment.meetingUrl!}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-600 hover:underline hidden sm:inline"
          >
            Open in new tab ↗
          </a>
        </div>
      </div>

      {/* ── Safety alert banner ── */}
      {escalation && (
        <div className="shrink-0 bg-red-50 border-b border-red-300 px-4 py-2 flex items-start justify-between gap-2">
          <p className="text-sm text-red-700 font-medium">
            ⚠ Safety alert: {escalation}
          </p>
          <button
            onClick={() => setEscalation(null)}
            className="text-red-500 text-xs hover:text-red-700 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Patient no-consultation message ── */}
      {!consultation && role === "patient" && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700">
          Waiting for the doctor to start the session. Your video room is ready below.
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Jitsi iframe ── */}
        {showVideo && (
          <div className={`flex flex-col ${showNotes || (consultation && roomId) ? "flex-1" : "w-full"}`}>
            <iframe
              src={appointment.meetingUrl!}
              className="flex-1 w-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              title="Video consultation room"
            />
          </div>
        )}

        {/* ── Right panel: Chat + Notes ── */}
        {consultation && roomId && (
          <div
            className={`flex flex-col border-l border-border bg-card ${
              showVideo ? "w-80 shrink-0" : "flex-1"
            }`}
          >
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setShowNotes(false)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  !showNotes
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Chat
              </button>
              {role === "doctor" && (
                <button
                  onClick={() => setShowNotes(true)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    showNotes
                      ? "text-foreground border-b-2 border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Notes {notes.length > 0 && `(${notes.length})`}
                </button>
              )}
              {role === "patient" && consultStatus === "ended" && notes.length > 0 && (
                <button
                  onClick={() => setShowNotes(true)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    showNotes
                      ? "text-foreground border-b-2 border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  My Notes ({notes.length})
                </button>
              )}
            </div>

            {/* ── Chat panel ── */}
            {!showNotes && (
              <>
                {/* Connection indicator */}
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 border-b border-border/50">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${socketReady ? "bg-green-500" : "bg-amber-400"}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {socketReady ? "Connected" : "Connecting…"}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-6">
                      No messages yet. Say hello!
                    </p>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.senderId === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}
                      >
                        {msg.safetyFlags.length > 0 && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5 max-w-[90%]">
                            ⚠ {msg.safetyFlags[0].guidance}
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
                          {msg.senderRole === "doctor" ? "Doctor" : "Patient"} ·{" "}
                          {timeLabel(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-border p-2 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Type a message…"
                    className="flex-1 border border-border bg-input-background text-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={!socketReady || consultStatus === "ended"}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || !socketReady || consultStatus === "ended"}
                    className="bg-teal-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-teal-700 disabled:opacity-40 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </>
            )}

            {/* ── Clinical Notes panel (doctor) ── */}
            {showNotes && role === "doctor" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {/* New / Edit note form */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {editingNoteId ? "Edit Note" : "New SOAP Note"}
                  </h3>

                  <textarea
                    rows={2}
                    placeholder="Chief complaint *"
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
                    placeholder="Patient summary (visible to patient after release)"
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
                      {savingNote ? "Saving…" : editingNoteId ? "Update" : "Save Draft"}
                    </button>
                    {editingNoteId && (
                      <button
                        onClick={() => {
                          setEditingNoteId(null);
                          setNoteSoap(EMPTY_SOAP);
                          setNotePatientSummary("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Existing notes */}
                {notes.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Saved Notes
                    </h3>
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="border border-border rounded-lg p-3 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              note.status === "final"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {note.status}
                            {note.releasedToPatientAt ? " · released" : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {timeLabel(note.createdAt)}
                          </span>
                        </div>

                        <p className="text-foreground font-medium">
                          {note.soap.subjective.chiefComplaint}
                        </p>
                        <p className="text-muted-foreground">
                          Dx: {note.soap.assessment.diagnosis}
                        </p>
                        <p className="text-muted-foreground">
                          Plan: {note.soap.plan.treatmentPlan}
                        </p>

                        <div className="flex gap-1.5 pt-1 flex-wrap">
                          {note.status === "draft" && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setNoteSoap(note.soap);
                                  setNotePatientSummary(note.patientSummary ?? "");
                                }}
                                className="text-[10px] border border-border rounded px-1.5 py-0.5 hover:bg-secondary"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleFinaliseNote(note.id)}
                                className="text-[10px] bg-green-600 text-white rounded px-1.5 py-0.5 hover:bg-green-700"
                              >
                                Finalise
                              </button>
                            </>
                          )}
                          {note.status === "final" && !note.releasedToPatientAt && (
                            <button
                              onClick={() => handleReleaseNote(note.id)}
                              className="text-[10px] bg-teal-600 text-white rounded px-1.5 py-0.5 hover:bg-teal-700"
                            >
                              Release to patient
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Clinical Notes panel (patient view) ── */}
            {showNotes && role === "patient" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clinical Notes from Doctor
                </h3>
                {notes.filter((n) => n.status === "final" && n.releasedToPatientAt).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No notes released yet.
                  </p>
                )}
                {notes
                  .filter((n) => n.status === "final" && n.releasedToPatientAt)
                  .map((note) => (
                    <div
                      key={note.id}
                      className="border border-border rounded-lg p-3 space-y-2 text-sm"
                    >
                      {note.patientSummary && (
                        <p className="text-foreground">{note.patientSummary}</p>
                      )}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Complaint: {note.soap.subjective.chiefComplaint}</p>
                        <p>Diagnosis: {note.soap.assessment.diagnosis}</p>
                        <p>Plan: {note.soap.plan.treatmentPlan}</p>
                        {note.soap.plan.medications && (
                          <p>Medications: {note.soap.plan.medications}</p>
                        )}
                        {note.soap.plan.followUpInstructions && (
                          <p>Follow-up: {note.soap.plan.followUpInstructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
