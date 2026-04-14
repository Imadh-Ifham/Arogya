export type ClinicalNoteStatus = "draft" | "final";
export type ClinicalNoteRole = "doctor" | "patient";

export interface SoapSubjective {
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  symptoms?: string;
}

export interface SoapObjective {
  vitals?: string;
  physicalExam?: string;
  investigations?: string;
}

export interface SoapAssessment {
  diagnosis: string;
  notes?: string;
}

export interface SoapPlan {
  treatmentPlan: string;
  medications?: string;
  followUpInstructions?: string;
}

export interface SoapNote {
  subjective: SoapSubjective;
  objective?: SoapObjective;
  assessment: SoapAssessment;
  plan: SoapPlan;
}

export interface ClinicalNoteActor {
  id: string;
  role: ClinicalNoteRole;
}

export interface CreateClinicalNoteInput {
  soap: SoapNote;
  patientSummary?: string;
  status?: ClinicalNoteStatus;
}

export interface UpdateClinicalNoteInput {
  soap?: SoapNote;
  patientSummary?: string;
  status?: ClinicalNoteStatus;
}

export interface ClinicalNoteView {
  id: string;
  consultationId: string;
  roomId: string;
  doctorId: string;
  soap: SoapNote;
  patientSummary?: string;
  status: ClinicalNoteStatus;
  releasedToPatientAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
