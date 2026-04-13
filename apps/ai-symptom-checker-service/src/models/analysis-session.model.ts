import mongoose, { Document, Schema } from "mongoose";
import type { AIAnalysisResult, EnrichedSpecialty, AnalysisStatus, Severity } from "../types/analysis.types";

export interface IAnalysisSession extends Document {
  sessionId: string;
  patientId: string;
  symptoms: string[];
  duration: string;
  severity: Severity;
  additionalNotes?: string;
  patientContext: {
    age?: number;
    gender?: string;
  };
  aiResult: AIAnalysisResult | null;
  enrichedSpecialties: EnrichedSpecialty[];
  rawPrompt: string;
  aiModel: string;
  processingTimeMs: number;
  status: AnalysisStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSessionSchema = new Schema<IAnalysisSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    symptoms: {
      type: [String],
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["mild", "moderate", "severe"],
      required: true,
    },
    additionalNotes: {
      type: String,
    },
    patientContext: {
      age: { type: Number },
      gender: { type: String },
    },
    aiResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
    enrichedSpecialties: {
      type: Schema.Types.Mixed,
      default: [],
    },
    rawPrompt: {
      type: String,
      required: true,
    },
    aiModel: {
      type: String,
      required: true,
    },
    processingTimeMs: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["completed", "failed", "partial"],
      default: "completed",
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const AnalysisSession = mongoose.model<IAnalysisSession>(
  "AnalysisSession",
  AnalysisSessionSchema
);
