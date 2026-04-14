import OpenAI from "openai";
import type { SymptomInput, AIAnalysisResult, UrgencyLevel, Likelihood } from "../types/analysis.types";

const FALLBACK_DISCLAIMER =
  "This is a preliminary AI-assisted analysis and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.";

function buildUserPrompt(input: SymptomInput): string {
  const age = input.age !== undefined ? String(input.age) : "Not provided";
  const gender = input.gender ?? "Not provided";
  const symptoms = input.symptoms.join(", ");
  const notes = input.additionalNotes ?? "None";

  return (
    `Patient details — Age: ${age}, Gender: ${gender}. ` +
    `Symptoms: ${symptoms}. ` +
    `Duration: ${input.duration}. Severity: ${input.severity}. ` +
    `Additional notes: ${notes}. ` +
    `Provide a full triage analysis.`
  );
}

const SYSTEM_PROMPT =
  'You are a medical triage assistant. Analyze the patient\'s symptoms and respond ' +
  'ONLY with a valid JSON object. Never include markdown, code blocks, or explanation outside JSON. ' +
  'The JSON must have these fields: urgencyLevel ("emergency"|"urgent"|"routine"|"self-care"), ' +
  'preliminarySuggestions (string[]), possibleConditions (array of {name, likelihood, description}), ' +
  'recommendedSpecialties (array of {specialty, reason}), selfCareAdvice (string[]), ' +
  'warningFlags (string[]), disclaimer (string).';

function extractJson(raw: string): string {
  // Strip markdown code fences if present
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // If it still doesn't start with '{', find the first '{' and last '}'
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned;
}

function isValidUrgencyLevel(value: unknown): value is UrgencyLevel {
  return (
    value === "emergency" ||
    value === "urgent" ||
    value === "routine" ||
    value === "self-care"
  );
}

function isValidLikelihood(value: unknown): value is Likelihood {
  return value === "high" || value === "medium" || value === "low";
}

function validateAIResult(parsed: unknown): parsed is AIAnalysisResult {
  if (typeof parsed !== "object" || parsed === null) return false;

  const obj = parsed as Record<string, unknown>;

  if (!isValidUrgencyLevel(obj.urgencyLevel)) return false;
  if (!Array.isArray(obj.preliminarySuggestions)) return false;
  if (!Array.isArray(obj.possibleConditions)) return false;
  if (!Array.isArray(obj.recommendedSpecialties)) return false;
  if (!Array.isArray(obj.selfCareAdvice)) return false;
  if (!Array.isArray(obj.warningFlags)) return false;
  if (typeof obj.disclaimer !== "string") return false;

  for (const cond of obj.possibleConditions) {
    if (
      typeof cond !== "object" ||
      cond === null ||
      typeof (cond as Record<string, unknown>).name !== "string" ||
      !isValidLikelihood((cond as Record<string, unknown>).likelihood) ||
      typeof (cond as Record<string, unknown>).description !== "string"
    ) {
      return false;
    }
  }

  for (const spec of obj.recommendedSpecialties) {
    if (
      typeof spec !== "object" ||
      spec === null ||
      typeof (spec as Record<string, unknown>).specialty !== "string" ||
      typeof (spec as Record<string, unknown>).reason !== "string"
    ) {
      return false;
    }
  }

  return true;
}

function buildFallbackResult(): AIAnalysisResult {
  return {
    urgencyLevel: "routine",
    preliminarySuggestions: [
      "Please consult a healthcare provider for a proper evaluation.",
    ],
    possibleConditions: [],
    recommendedSpecialties: [
      {
        specialty: "General Physician",
        reason: "Unable to determine specific specialty; general evaluation recommended.",
      },
    ],
    selfCareAdvice: ["Rest and stay hydrated.", "Monitor your symptoms closely."],
    warningFlags: [],
    disclaimer: FALLBACK_DISCLAIMER,
  };
}

export interface AIServiceResult {
  aiResult: AIAnalysisResult;
  rawPrompt: string;
  aiModel: string;
  processingTimeMs: number;
  status: "completed" | "partial";
}

export async function analyzeSymptoms(
  input: SymptomInput
): Promise<AIServiceResult> {
  const client = new OpenAI({
    apiKey: process.env.AI_API_KEY as string,
    baseURL: process.env.AI_API_ENDPOINT as string,
  });

  const model = process.env.AI_MODEL as string;
  const userPrompt = buildUserPrompt(input);
  const startTime = Date.now();

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10000; // 10s — enough for Gemini free-tier rate limit reset

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const processingTimeMs = Date.now() - startTime;
      const rawContent = completion.choices[0]?.message?.content ?? "";
      console.log("[ai.service] Raw AI response:", rawContent.slice(0, 500));
      const cleaned = extractJson(rawContent);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("[ai.service] Failed to parse AI JSON response:", cleaned.slice(0, 300));
        return {
          aiResult: buildFallbackResult(),
          rawPrompt: userPrompt,
          aiModel: model,
          processingTimeMs,
          status: "partial",
        };
      }

      if (!validateAIResult(parsed)) {
        console.error("[ai.service] AI response failed shape validation:", JSON.stringify(parsed).slice(0, 300));

        const partial = parsed as Record<string, unknown>;
        const salvaged: AIAnalysisResult = {
          urgencyLevel: isValidUrgencyLevel(partial.urgencyLevel)
            ? partial.urgencyLevel
            : "routine",
          preliminarySuggestions: Array.isArray(partial.preliminarySuggestions)
            ? (partial.preliminarySuggestions as string[])
            : [],
          possibleConditions: Array.isArray(partial.possibleConditions)
            ? (partial.possibleConditions as AIAnalysisResult["possibleConditions"])
            : [],
          recommendedSpecialties: Array.isArray(partial.recommendedSpecialties)
            ? (partial.recommendedSpecialties as AIAnalysisResult["recommendedSpecialties"])
            : [],
          selfCareAdvice: Array.isArray(partial.selfCareAdvice)
            ? (partial.selfCareAdvice as string[])
            : [],
          warningFlags: Array.isArray(partial.warningFlags)
            ? (partial.warningFlags as string[])
            : [],
          disclaimer:
            typeof partial.disclaimer === "string"
              ? partial.disclaimer
              : FALLBACK_DISCLAIMER,
        };

        return {
          aiResult: salvaged,
          rawPrompt: userPrompt,
          aiModel: model,
          processingTimeMs,
          status: "partial",
        };
      }

      if (!parsed.disclaimer) {
        parsed.disclaimer = FALLBACK_DISCLAIMER;
      }

      return {
        aiResult: parsed,
        rawPrompt: userPrompt,
        aiModel: model,
        processingTimeMs,
        status: "completed",
      };

    } catch (err) {
      const is429 =
        err instanceof OpenAI.APIError && err.status === 429;

      if (is429 && attempt < MAX_RETRIES) {
        console.warn(
          `[ai.service] Rate limited (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      const processingTimeMs = Date.now() - startTime;

      if (err instanceof OpenAI.APIError) {
        console.error(`[ai.service] API error — status: ${err.status}, message: ${err.message}`);
      } else {
        console.error("[ai.service] Unexpected error:", err instanceof Error ? err.message : String(err));
      }

      return {
        aiResult: buildFallbackResult(),
        rawPrompt: userPrompt,
        aiModel: model,
        processingTimeMs,
        status: "partial",
      };
    }
  }

  // Should never reach here, but TypeScript requires a return
  return {
    aiResult: buildFallbackResult(),
    rawPrompt: userPrompt,
    aiModel: model,
    processingTimeMs: Date.now() - startTime,
    status: "partial",
  };
}
