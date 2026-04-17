import api from "../../../lib/api";

export type Severity = "mild" | "moderate" | "severe";

export interface SymptomInput {
  symptoms: string[];
  duration: string;
  severity: Severity;
  additionalNotes?: string;
  age?: number;
  gender?: "male" | "female" | "other";
}

export interface PossibleCondition {
  name: string;
  likelihood: "high" | "medium" | "low";
  description: string;
}

export interface EnrichedSpecialty {
  specialty: string;
  code: string;
  reason: string;
  priority: "high" | "normal";
}

export interface AnalyzeResponse {
  analysisId: string;
  patientId: string;
  urgencyLevel: string;
  preliminarySuggestions: string[];
  possibleConditions: PossibleCondition[];
  recommendedSpecialties: EnrichedSpecialty[];
  selfCareAdvice: string[];
  warningFlags: string[];
  disclaimer: string;
  processingTimeMs: number;
  createdAt: string;
  status: "completed" | "partial";
}

export async function analyzeSymptoms(input: SymptomInput): Promise<AnalyzeResponse> {
  const { data } = await api.post("/ai/analyze", input);
  return data as AnalyzeResponse;
}
