export type UrgencyLevel = "emergency" | "urgent" | "routine" | "self-care";
export type Severity = "mild" | "moderate" | "severe";
export type Gender = "male" | "female" | "other";
export type AnalysisStatus = "completed" | "failed" | "partial";
export type Likelihood = "high" | "medium" | "low";
export type Priority = "high" | "normal";

export interface SymptomInput {
  symptoms: string[];
  duration: string;
  severity: Severity;
  additionalNotes?: string;
  age?: number;
  gender?: Gender;
}

export interface PossibleCondition {
  name: string;
  likelihood: Likelihood;
  description: string;
}

export interface RecommendedSpecialty {
  specialty: string;
  reason: string;
}

export interface AIAnalysisResult {
  urgencyLevel: UrgencyLevel;
  preliminarySuggestions: string[];
  possibleConditions: PossibleCondition[];
  recommendedSpecialties: RecommendedSpecialty[];
  selfCareAdvice: string[];
  warningFlags: string[];
  disclaimer: string;
}

export interface EnrichedSpecialty {
  specialty: string;
  code: string;
  reason: string;
  priority: Priority;
}

export interface AnalyzeResponse {
  analysisId: string;
  patientId: string;
  urgencyLevel: string;
  preliminarySuggestions: string[];
  possibleConditions: AIAnalysisResult["possibleConditions"];
  recommendedSpecialties: EnrichedSpecialty[];
  selfCareAdvice: string[];
  warningFlags: string[];
  disclaimer: string;
  processingTimeMs: number;
  createdAt: string;
}

export interface PaginatedHistory {
  data: AnalyzeResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
