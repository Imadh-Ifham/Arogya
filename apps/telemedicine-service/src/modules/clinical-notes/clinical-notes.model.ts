import { Schema, model, type Types } from "mongoose";
import type { ClinicalNoteStatus } from "./clinical-notes.types.js";

export interface SoapSubjectiveDocument {
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  symptoms?: string;
}

export interface SoapObjectiveDocument {
  vitals?: string;
  physicalExam?: string;
  investigations?: string;
}

export interface SoapAssessmentDocument {
  diagnosis: string;
  notes?: string;
}

export interface SoapPlanDocument {
  treatmentPlan: string;
  medications?: string;
  followUpInstructions?: string;
}

export interface SoapNoteDocument {
  subjective: SoapSubjectiveDocument;
  objective?: SoapObjectiveDocument;
  assessment: SoapAssessmentDocument;
  plan: SoapPlanDocument;
}

export interface ClinicalNoteDocument {
  consultationId: Types.ObjectId;
  roomId: Types.ObjectId;
  doctorId: string;
  soap: SoapNoteDocument;
  patientSummary?: string;
  status: ClinicalNoteStatus;
  releasedToPatientAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subjectiveSchema = new Schema<SoapSubjectiveDocument>(
  {
    chiefComplaint: { type: String, required: true, maxlength: 2000 },
    historyOfPresentIllness: { type: String, required: false, maxlength: 5000 },
    symptoms: { type: String, required: false, maxlength: 3000 },
  },
  { _id: false },
);

const objectiveSchema = new Schema<SoapObjectiveDocument>(
  {
    vitals: { type: String, required: false, maxlength: 3000 },
    physicalExam: { type: String, required: false, maxlength: 5000 },
    investigations: { type: String, required: false, maxlength: 5000 },
  },
  { _id: false },
);

const assessmentSchema = new Schema<SoapAssessmentDocument>(
  {
    diagnosis: { type: String, required: true, maxlength: 2000 },
    notes: { type: String, required: false, maxlength: 5000 },
  },
  { _id: false },
);

const planSchema = new Schema<SoapPlanDocument>(
  {
    treatmentPlan: { type: String, required: true, maxlength: 5000 },
    medications: { type: String, required: false, maxlength: 5000 },
    followUpInstructions: { type: String, required: false, maxlength: 3000 },
  },
  { _id: false },
);

const soapSchema = new Schema<SoapNoteDocument>(
  {
    subjective: { type: subjectiveSchema, required: true },
    objective: { type: objectiveSchema, required: false },
    assessment: { type: assessmentSchema, required: true },
    plan: { type: planSchema, required: true },
  },
  { _id: false },
);

const clinicalNoteSchema = new Schema<ClinicalNoteDocument>(
  {
    consultationId: {
      type: Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "ConsultationRoom",
      required: true,
      index: true,
    },
    doctorId: { type: String, required: true, index: true },
    soap: { type: soapSchema, required: true },
    patientSummary: { type: String, required: false, maxlength: 3000 },
    status: {
      type: String,
      enum: ["draft", "final"],
      default: "draft",
      index: true,
    },
    releasedToPatientAt: { type: Date, required: false },
    deletedAt: { type: Date, required: false, index: true },
  },
  {
    timestamps: true,
  },
);

clinicalNoteSchema.index({ consultationId: 1, createdAt: -1 });
clinicalNoteSchema.index({ roomId: 1, createdAt: -1 });
clinicalNoteSchema.index({ doctorId: 1, createdAt: -1 });
clinicalNoteSchema.index({ consultationId: 1, deletedAt: 1 });

export const ClinicalNoteModel = model<ClinicalNoteDocument>(
  "ClinicalNote",
  clinicalNoteSchema,
);
