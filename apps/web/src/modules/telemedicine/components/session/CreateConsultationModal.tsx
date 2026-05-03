type Role = "doctor" | "patient";

type CreateConsultationModalProps = {
  open: boolean;
  role: Role;
  createDate: string;
  createTime: string;
  creatingConsultation: boolean;
  createModalError: string | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
};

export default function CreateConsultationModal({
  open,
  role,
  createDate,
  createTime,
  creatingConsultation,
  createModalError,
  onDateChange,
  onTimeChange,
  onClose,
  onCreate,
}: CreateConsultationModalProps) {
  if (!open || role !== "doctor") return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] grid place-items-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Schedule New Consultation
          </h3>
          <button
            type="button"
            onClick={onClose}
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
              onChange={(event) => onDateChange(event.target.value)}
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
              onChange={(event) => onTimeChange(event.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
            />
          </div>

          {createModalError && (
            <p className="text-xs text-red-600">{createModalError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={creatingConsultation}
              className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={creatingConsultation}
              className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              {creatingConsultation ? "Creating..." : "Create Consultation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
