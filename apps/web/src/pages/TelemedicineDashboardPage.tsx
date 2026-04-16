import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import {
  fetchDoctorConsultations,
  fetchPatientConsultations,
} from "../modules/telemedicine/api/rest";
import type { ConsultationView, ConsultationStatus } from "../modules/telemedicine/api/rest";
import Layout from "../components/Layout";
import {
  Video,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

// ─── Status display config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ConsultationStatus,
  { label: string; icon: React.ElementType; dot: string; badge: string }
> = {
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  active: {
    label: "In Progress",
    icon: Video,
    dot: "bg-green-500 animate-pulse",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  ended: {
    label: "Ended",
    icon: CheckCircle2,
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};

const STATUS_ORDER: ConsultationStatus[] = ["active", "scheduled", "ended", "cancelled"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// ─── Consultation card ────────────────────────────────────────────────────────

function ConsultationCard({
  consultation,
  role,
}: {
  consultation: ConsultationView;
  role: "doctor" | "patient";
}) {
  const cfg = STATUS_CONFIG[consultation.status];
  const Icon = cfg.icon;
  const consultationPath =
    role === "doctor"
      ? `/doctor/appointments/${consultation.appointmentId}/consultation`
      : `/appointments/${consultation.appointmentId}/consultation`;

  const canJoin = consultation.status === "active" || consultation.status === "scheduled";

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 hover:border-primary/40 transition-colors">
      {/* Status dot */}
      <div className="mt-1 flex-shrink-0">
        <span className={`block w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge} flex items-center gap-1`}
          >
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          {consultation.status === "active" && (
            <span className="text-xs text-green-600 font-semibold">LIVE</span>
          )}
        </div>

        <p className="text-sm font-medium text-foreground mt-1.5 truncate">
          Consultation #{consultation.id.slice(-8)}
        </p>

        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {formatDate(consultation.startsAt)}
        </p>

        {consultation.room && consultation.status !== "cancelled" && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
            Room: {consultation.room.jitsiRoomName}
          </p>
        )}
      </div>

      {/* CTA */}
      {canJoin ? (
        <Link
          to={consultationPath}
          className="flex-shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          {consultation.status === "active" ? (
            <>
              <Video className="w-3.5 h-3.5" />
              Join
            </>
          ) : (
            <>
              <Video className="w-3.5 h-3.5" />
              Open
            </>
          )}
        </Link>
      ) : (
        <Link
          to={consultationPath}
          className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Grouped section ──────────────────────────────────────────────────────────

function StatusGroup({
  status,
  consultations,
  role,
}: {
  status: ConsultationStatus;
  consultations: ConsultationView[];
  role: "doctor" | "patient";
}) {
  if (consultations.length === 0) return null;
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {cfg.label}
        </h2>
        <span className="text-xs text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
          {consultations.length}
        </span>
      </div>
      <div className="space-y-2">
        {consultations.map((c) => (
          <ConsultationCard key={c.id} consultation={c} role={role} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TelemedicineDashboardPage() {
  const { user } = useAppSelector((s) => s.auth);

  const [consultations, setConsultations] = useState<ConsultationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role: "doctor" | "patient" = user?.role === "doctor" ? "doctor" : "patient";

  useEffect(() => {
    const userId = user?._id;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetch =
      role === "doctor"
        ? fetchDoctorConsultations(userId)
        : fetchPatientConsultations(userId);

    fetch
      .then((data) => {
        // Sort: active first, then by startsAt descending
        const sorted = [...data].sort((a, b) => {
          const statusRank = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
          if (statusRank !== 0) return statusRank;
          return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        });
        setConsultations(sorted);
      })
      .catch(() => setError("Failed to load consultations. Please try again."))
      .finally(() => setLoading(false));
  }, [user?.id, role]);

  // Group by status
  const grouped = STATUS_ORDER.reduce<Record<ConsultationStatus, ConsultationView[]>>(
    (acc, s) => {
      acc[s] = consultations.filter((c) => c.status === s);
      return acc;
    },
    { active: [], scheduled: [], ended: [], cancelled: [] },
  );

  const hasAny = consultations.length > 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              Telemedicine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {role === "doctor"
                ? "Your online consultations with patients"
                : "Your scheduled video consultations"}
            </p>
          </div>

          {/* Active live badge */}
          {grouped.active.length > 0 && (
            <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {grouped.active.length} Live
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading consultations…</p>
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
            <p className="text-sm font-medium text-foreground">No consultations yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {role === "patient"
                ? "Book an online appointment to start a telemedicine consultation."
                : "Once patients book online appointments that you accept, they'll appear here."}
            </p>
            {role === "patient" && (
              <Link
                to="/slots"
                className="mt-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Browse doctors
              </Link>
            )}
          </div>
        )}

        {/* Grouped lists */}
        {!loading && !error && hasAny && (
          <div className="space-y-8">
            {STATUS_ORDER.map((s) => (
              <StatusGroup key={s} status={s} consultations={grouped[s]} role={role} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
