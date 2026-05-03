import { Play, XCircle } from "lucide-react";
import type { ConsultationView } from "../../api/rest";

type Role = "doctor" | "patient";

type SessionControlsProps = {
  selectedConsultation: ConsultationView | null;
  role: Role;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
};

export default function SessionControls({
  selectedConsultation,
  role,
  onStart,
  onEnd,
}: SessionControlsProps) {
  if (!selectedConsultation || role !== "doctor") return null;

  return (
    <div className="flex gap-2">
      {selectedConsultation.status === "scheduled" && (
        <button
          type="button"
          onClick={() => onStart(selectedConsultation.id)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-1"
        >
          <Play className="w-3.5 h-3.5" /> Start
        </button>
      )}
      {selectedConsultation.status === "active" && (
        <button
          type="button"
          onClick={() => onEnd(selectedConsultation.id)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1"
        >
          <XCircle className="w-3.5 h-3.5" /> End
        </button>
      )}
    </div>
  );
}
