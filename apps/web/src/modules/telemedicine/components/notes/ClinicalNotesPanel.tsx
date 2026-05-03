import type { Dispatch, SetStateAction } from "react";
import { FileText } from "lucide-react";
import type { ClinicalNote, ConsultationView, SoapNote } from "../../api/rest";
import NotesList from "./NotesList";
import SoapForm from "./SoapForm";

type DoctorNotesProps = {
  variant: "doctor";
  selectedConsultation: ConsultationView | null;
  notes: ClinicalNote[];
  soap: SoapNote;
  noteSummary: string;
  onSoapChange: Dispatch<SetStateAction<SoapNote>>;
  onNoteSummaryChange: Dispatch<SetStateAction<string>>;
  onSaveDraft: () => void;
  onFinalise: (noteId: string) => void;
  formatDate: (iso: string) => string;
};

type PatientNotesProps = {
  variant: "patient";
  selectedConsultation: ConsultationView | null;
  notes: ClinicalNote[];
  formatDate: (iso: string) => string;
};

type ClinicalNotesPanelProps = DoctorNotesProps | PatientNotesProps;

export default function ClinicalNotesPanel(props: ClinicalNotesPanelProps) {
  const { selectedConsultation, notes, formatDate } = props;
  const isDoctor = props.variant === "doctor";

  return (
    <div className="rounded-xl border border-border p-3 bg-background/70 space-y-2 mt-3">
      <h3 className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
        <FileText className="w-3.5 h-3.5" />
        {isDoctor ? "Clinical Notes" : "My Released Notes"}
      </h3>
      {!selectedConsultation && (
        <p className="text-xs text-muted-foreground">
          {isDoctor
            ? "Select consultation to manage notes."
            : "Select consultation to view notes."}
        </p>
      )}
      {selectedConsultation && isDoctor && (
        <>
          <SoapForm
            soap={props.soap}
            noteSummary={props.noteSummary}
            onSoapChange={props.onSoapChange}
            onNoteSummaryChange={props.onNoteSummaryChange}
            onSaveDraft={props.onSaveDraft}
          />
          <div className="space-y-2 max-h-44 overflow-y-auto">
            <NotesList
              notes={notes}
              variant="doctor"
              formatDate={formatDate}
              onFinalise={props.onFinalise}
            />
          </div>
        </>
      )}
      {selectedConsultation && !isDoctor && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No released notes yet.
            </p>
          )}
          {notes.length > 0 && (
            <NotesList
              notes={notes}
              variant="patient"
              formatDate={formatDate}
            />
          )}
        </div>
      )}
    </div>
  );
}
