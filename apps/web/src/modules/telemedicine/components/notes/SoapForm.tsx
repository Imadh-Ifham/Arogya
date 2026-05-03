import type { Dispatch, SetStateAction } from "react";
import type { SoapNote } from "../../api/rest";

type SoapFormProps = {
  soap: SoapNote;
  noteSummary: string;
  onSoapChange: Dispatch<SetStateAction<SoapNote>>;
  onNoteSummaryChange: Dispatch<SetStateAction<string>>;
  onSaveDraft: () => void;
};

export default function SoapForm({
  soap,
  noteSummary,
  onSoapChange,
  onNoteSummaryChange,
  onSaveDraft,
}: SoapFormProps) {
  return (
    <>
      <textarea
        rows={2}
        value={soap.subjective.chiefComplaint}
        onChange={(event) =>
          onSoapChange((prev) => ({
            ...prev,
            subjective: {
              ...prev.subjective,
              chiefComplaint: event.target.value,
            },
          }))
        }
        placeholder="Chief complaint"
        className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
      />
      <textarea
        rows={2}
        value={soap.assessment.diagnosis}
        onChange={(event) =>
          onSoapChange((prev) => ({
            ...prev,
            assessment: {
              ...prev.assessment,
              diagnosis: event.target.value,
            },
          }))
        }
        placeholder="Diagnosis"
        className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
      />
      <textarea
        rows={2}
        value={soap.plan.treatmentPlan}
        onChange={(event) =>
          onSoapChange((prev) => ({
            ...prev,
            plan: {
              ...prev.plan,
              treatmentPlan: event.target.value,
            },
          }))
        }
        placeholder="Treatment plan"
        className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
      />
      <input
        value={noteSummary}
        onChange={(event) => onNoteSummaryChange(event.target.value)}
        placeholder="Patient summary"
        className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-input-background"
      />
      <button
        type="button"
        onClick={onSaveDraft}
        className="w-full text-xs px-2.5 py-2 rounded-lg bg-primary text-primary-foreground"
      >
        Save Draft Note
      </button>
    </>
  );
}
