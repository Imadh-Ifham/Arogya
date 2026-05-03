import type { ClinicalNote } from "../../api/rest";

type NotesListProps = {
  notes: ClinicalNote[];
  variant: "doctor" | "patient";
  formatDate: (iso: string) => string;
  onFinalise?: (noteId: string) => void;
};

export default function NotesList({
  notes,
  variant,
  formatDate,
  onFinalise,
}: NotesListProps) {
  return (
    <>
      {notes.map((note) => (
        <div key={note.id} className="border border-border rounded-lg p-2">
          <p className="text-[11px] text-muted-foreground">
            {variant === "doctor"
              ? `${note.status} - ${formatDate(note.createdAt)}`
              : formatDate(note.createdAt)}
          </p>
          <p className="text-xs text-foreground mt-0.5">
            {variant === "doctor"
              ? note.soap.assessment.diagnosis || "No diagnosis"
              : (note.patientSummary ?? note.soap.plan.treatmentPlan)}
          </p>
          {variant === "doctor" && note.status !== "final" && onFinalise && (
            <button
              type="button"
              onClick={() => onFinalise(note.id)}
              className="mt-1.5 text-[11px] px-2 py-1 rounded border border-border hover:bg-secondary"
            >
              Finalise + Release
            </button>
          )}
        </div>
      ))}
    </>
  );
}
