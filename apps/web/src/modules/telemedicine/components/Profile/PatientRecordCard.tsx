import { User } from "lucide-react";

type PatientRecord = {
  displayId: string;
  ageBand: string;
  bloodGroup: string;
  allergies: string;
  chronic: string;
  triage: string;
};

type PatientRecordCardProps = {
  record: PatientRecord;
};

export default function PatientRecordCard({ record }: PatientRecordCardProps) {
  return (
    <>
      <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
        <User className="w-4 h-4" /> Patient Record
      </h2>
      <div className="text-xs space-y-1.5 rounded-xl border border-border p-3 bg-background/70 mt-3">
        <p>
          <span className="text-muted-foreground">Patient ID:</span>{" "}
          {record.displayId}
        </p>
        <p>
          <span className="text-muted-foreground">Age band:</span>{" "}
          {record.ageBand}
        </p>
        <p>
          <span className="text-muted-foreground">Blood group:</span>{" "}
          {record.bloodGroup}
        </p>
        <p>
          <span className="text-muted-foreground">Allergies:</span>{" "}
          {record.allergies}
        </p>
        <p>
          <span className="text-muted-foreground">Chronic:</span>{" "}
          {record.chronic}
        </p>
        <p>
          <span className="text-muted-foreground">Triage:</span> {record.triage}
        </p>
      </div>
    </>
  );
}
