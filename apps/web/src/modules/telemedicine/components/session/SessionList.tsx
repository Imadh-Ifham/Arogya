import { ClipboardPlus, Video } from "lucide-react";
import type { ConsultationStatus, ConsultationView } from "../../api/rest";

type Role = "doctor" | "patient";

type SessionListProps = {
  consultations: ConsultationView[];
  selectedConsultationId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  role: Role;
  statusPill: (status: ConsultationStatus) => string;
  formatDate: (iso: string) => string;
};

export default function SessionList({
  consultations,
  selectedConsultationId,
  onSelect,
  onAdd,
  role,
  statusPill,
  formatDate,
}: SessionListProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-3 flex flex-col min-h-0 flex-[1.15]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
          <Video className="w-4 h-4" /> Sessions
        </h2>
        {role === "doctor" && (
          <button
            type="button"
            onClick={onAdd}
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
            onClick={() => onSelect(session.id)}
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
                className={`text-[11px] px-2 py-0.5 rounded-full border ${statusPill(
                  session.status,
                )}`}
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
  );
}
