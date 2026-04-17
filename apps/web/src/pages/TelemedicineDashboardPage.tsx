import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchDoctorRooms,
  fetchPatientRooms,
} from "../modules/telemedicine/api/rest";
import type { ConsultationRoom } from "../modules/telemedicine/api/rest";
import Layout from "../components/Layout";
import {
  Video,
  AlertCircle,
  CalendarClock,
  ExternalLink,
  CircleCheck,
  User,
  Stethoscope,
  ShieldAlert,
  TimerReset,
  XCircle,
  RefreshCw,
  Clock3,
  Activity,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DoctorProfile = {
  name: string;
  specialty: string;
  experience: string;
  languages: string;
  rating: string;
  nextInstruction: string;
};

type PatientRecord = {
  ageBand: string;
  triageTag: string;
  chronicHistory: string;
  allergyFlag: string;
  lastVisit: string;
  riskLevel: "Low" | "Moderate" | "Watch";
};

type RoomUiState = {
  closed: boolean;
  expiresAt?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortRoomId(roomId: string): string {
  return `TM-RM-${roomId.slice(-6).toUpperCase()}`;
}

function maskId(value: string): string {
  if (value.length <= 4) return value;
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

function seedToIndex(seed: string, len: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % len;
}

const DUMMY_DOCTOR_PROFILES: DoctorProfile[] = [
  {
    name: "Dr. Anika Rao",
    specialty: "Internal Medicine",
    experience: "11 yrs exp",
    languages: "EN, HI, TA",
    rating: "4.8",
    nextInstruction: "Keep latest vitals handy before joining.",
  },
  {
    name: "Dr. Kabir Menon",
    specialty: "Cardiology",
    experience: "14 yrs exp",
    languages: "EN, HI, ML",
    rating: "4.9",
    nextInstruction: "Share prior ECG reports if available.",
  },
  {
    name: "Dr. Isha Verma",
    specialty: "Dermatology",
    experience: "8 yrs exp",
    languages: "EN, HI",
    rating: "4.7",
    nextInstruction: "Use good lighting for skin review.",
  },
  {
    name: "Dr. Rohan Iyer",
    specialty: "General Practice",
    experience: "9 yrs exp",
    languages: "EN, HI, KN",
    rating: "4.6",
    nextInstruction: "List current medications before consult.",
  },
];

const DUMMY_PATIENT_RECORDS: PatientRecord[] = [
  {
    ageBand: "29-34",
    triageTag: "Follow-up",
    chronicHistory: "Mild asthma",
    allergyFlag: "Penicillin",
    lastVisit: "6 days ago",
    riskLevel: "Moderate",
  },
  {
    ageBand: "41-46",
    triageTag: "Medication review",
    chronicHistory: "Type-2 diabetes",
    allergyFlag: "No known allergies",
    lastVisit: "2 weeks ago",
    riskLevel: "Watch",
  },
  {
    ageBand: "22-28",
    triageTag: "Acute symptom",
    chronicHistory: "None reported",
    allergyFlag: "Dust sensitivity",
    lastVisit: "First consult",
    riskLevel: "Low",
  },
  {
    ageBand: "35-40",
    triageTag: "Chronic monitoring",
    chronicHistory: "Hypertension",
    allergyFlag: "Sulfa drugs",
    lastVisit: "3 days ago",
    riskLevel: "Watch",
  },
];

function getDummyDoctorProfile(room: ConsultationRoom): DoctorProfile {
  return DUMMY_DOCTOR_PROFILES[
    seedToIndex(room.id, DUMMY_DOCTOR_PROFILES.length)
  ];
}

function getDummyPatientRecord(room: ConsultationRoom): PatientRecord {
  return DUMMY_PATIENT_RECORDS[
    seedToIndex(room.id, DUMMY_PATIENT_RECORDS.length)
  ];
}

function riskPill(risk: PatientRecord["riskLevel"]): string {
  if (risk === "Watch") return "bg-red-50 text-red-700 border-red-200";
  if (risk === "Moderate") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-green-50 text-green-700 border-green-200";
}

// ─── Patient room card ───────────────────────────────────────────────────────

function PatientRoomCard({
  room,
  role,
}: {
  room: ConsultationRoom;
  role: "doctor" | "patient";
}) {
  const doctor = getDummyDoctorProfile(room);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200 inline-flex items-center gap-1">
              <CircleCheck className="w-3 h-3" />
              Active Room
            </span>
            <span className="text-xs text-muted-foreground">
              {formatShortRoomId(room.id)}
            </span>
          </div>

          <h3 className="text-base font-semibold text-foreground truncate">
            {doctor.name}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4" />
            {doctor.specialty} • {doctor.experience}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs mt-3">
            <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
              <p className="text-muted-foreground">Languages</p>
              <p className="text-foreground font-medium">{doctor.languages}</p>
            </div>
            <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
              <p className="text-muted-foreground">Rating</p>
              <p className="text-foreground font-medium">{doctor.rating} / 5</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Next step:{" "}
            <span className="text-foreground">{doctor.nextInstruction}</span>
          </p>
        </div>

        <Link
          to={
            role === "doctor"
              ? `/doctor/telemedicine/rooms/${room.id}`
              : `/patient/telemedicine/rooms/${room.id}`
          }
          className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Room
        </Link>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-2">
        <div className="text-xs rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground inline-flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Room expires
          </p>
          <p className="text-foreground font-medium">
            {formatDate(room.expiresAt)}
          </p>
        </div>
        <div className="text-xs rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            Doctor code
          </p>
          <p className="text-foreground font-medium">{maskId(room.doctorId)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor room card ────────────────────────────────────────────────────────

function DoctorRoomCard({
  room,
  uiState,
  onExtend,
  onClose,
  onReopen,
}: {
  room: ConsultationRoom;
  uiState: RoomUiState | undefined;
  onExtend: (roomId: string) => void;
  onClose: (roomId: string) => void;
  onReopen: (roomId: string) => void;
}) {
  const record = getDummyPatientRecord(room);
  const isClosed = uiState?.closed === true;
  const currentExpiry = uiState?.expiresAt ?? room.expiresAt;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                isClosed
                  ? "bg-gray-50 text-gray-600 border-gray-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}
            >
              <CircleCheck className="w-3 h-3" />
              {isClosed ? "Closed (local)" : "Active Room"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatShortRoomId(room.id)}
            </span>
          </div>

          <h3 className="text-base font-semibold text-foreground truncate">
            Patient Workspace
          </h3>
          <p className="text-sm text-muted-foreground">
            Patient code:{" "}
            <span className="text-foreground font-medium">
              {maskId(room.patientId)}
            </span>
          </p>
        </div>

        <Link
          to={`/doctor/telemedicine/rooms/${room.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Room
        </Link>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground inline-flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            Triage tag
          </p>
          <p className="text-foreground font-medium">{record.triageTag}</p>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground">Age band</p>
          <p className="text-foreground font-medium">{record.ageBand}</p>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground">Last visit</p>
          <p className="text-foreground font-medium">{record.lastVisit}</p>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground">Chronic history</p>
          <p className="text-foreground font-medium">{record.chronicHistory}</p>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground">Allergy flag</p>
          <p className="text-foreground font-medium">{record.allergyFlag}</p>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-2 bg-background/70">
          <p className="text-muted-foreground inline-flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Risk profile
          </p>
          <span
            className={`inline-flex text-[11px] border rounded-full px-2 py-0.5 mt-1 ${riskPill(record.riskLevel)}`}
          >
            {record.riskLevel}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mr-1">
          <Clock3 className="w-3.5 h-3.5" />
          Expires: {formatDate(currentExpiry)}
        </span>

        <button
          type="button"
          onClick={() => onExtend(room.id)}
          className="text-xs border border-border text-foreground rounded-lg px-2.5 py-1.5 hover:bg-secondary transition-colors inline-flex items-center gap-1"
        >
          <TimerReset className="w-3.5 h-3.5" />
          Extend 30m
        </button>

        {!isClosed ? (
          <button
            type="button"
            onClick={() => onClose(room.id)}
            className="text-xs border border-red-200 text-red-700 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors inline-flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" />
            Close
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReopen(room.id)}
            className="text-xs border border-green-200 text-green-700 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reopen
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Quick actions are UI-only for now and don’t persist to backend.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TelemedicineDashboardPage({
  audience,
}: {
  audience: "doctor" | "patient";
}) {
  const [rooms, setRooms] = useState<ConsultationRoom[]>([]);
  const [roomUiState, setRoomUiState] = useState<Record<string, RoomUiState>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role: "doctor" | "patient" = audience;
  const userId = role === "doctor" ? "1111111111" : "2222222222";

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetch =
      role === "doctor"
        ? fetchDoctorRooms(userId, true)
        : fetchPatientRooms(userId, true);

    fetch
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) =>
            new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
        );
        setRooms(sorted);
        setRoomUiState({});
      })
      .catch(() => setError("Failed to load active rooms. Please try again."))
      .finally(() => setLoading(false));
  }, [userId, role]);

  const applyRoomUiState = (room: ConsultationRoom): ConsultationRoom => {
    const ui = roomUiState[room.id];
    if (!ui?.expiresAt) return room;
    return { ...room, expiresAt: ui.expiresAt };
  };

  const visibleRooms = rooms
    .map(applyRoomUiState)
    .filter((room) => !roomUiState[room.id]?.closed);

  const hasAny = visibleRooms.length > 0;

  const extendRoomUi = (roomId: string) => {
    const target = rooms.find((room) => room.id === roomId);
    if (!target) return;

    const currentExpiry = roomUiState[roomId]?.expiresAt ?? target.expiresAt;
    const nextExpiry = new Date(
      new Date(currentExpiry).getTime() + 30 * 60 * 1000,
    ).toISOString();

    setRoomUiState((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        closed: false,
        expiresAt: nextExpiry,
      },
    }));
  };

  const closeRoomUi = (roomId: string) => {
    setRoomUiState((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        closed: true,
      },
    }));
  };

  const reopenRoomUi = (roomId: string) => {
    const target = rooms.find((room) => room.id === roomId);
    if (!target) return;

    const currentExpiry = roomUiState[roomId]?.expiresAt ?? target.expiresAt;
    const minExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const nextExpiry =
      new Date(currentExpiry).getTime() > Date.now()
        ? currentExpiry
        : minExpiry;

    setRoomUiState((prev) => ({
      ...prev,
      [roomId]: {
        closed: false,
        expiresAt: nextExpiry,
      },
    }));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              {role === "doctor"
                ? "Doctor Telemedicine"
                : "Patient Telemedicine"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {role === "doctor"
                ? "Dedicated doctor workspace for your active rooms"
                : "Dedicated patient workspace for your active rooms"}
            </p>
          </div>

          {visibleRooms.length > 0 && (
            <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {visibleRooms.length} Active
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading consultations…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs underline mt-1 hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !hasAny && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Video className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              No active rooms visible
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {role === "patient"
                ? "No non-expired room is allocated to this patient yet."
                : "No non-expired room is allocated to this doctor yet, or you locally closed them all."}
            </p>
          </div>
        )}

        {/* Room list */}
        {!loading && !error && hasAny && (
          <div className="space-y-3">
            {visibleRooms.map((room) =>
              role === "doctor" ? (
                <DoctorRoomCard
                  key={room.id}
                  room={room}
                  uiState={roomUiState[room.id]}
                  onExtend={extendRoomUi}
                  onClose={closeRoomUi}
                  onReopen={reopenRoomUi}
                />
              ) : (
                <PatientRoomCard key={room.id} room={room} role={role} />
              ),
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
