import OpenAI from "openai";
import type { SymptomInput, AIAnalysisResult, UrgencyLevel, Likelihood } from "../types/analysis.types";

const FALLBACK_DISCLAIMER =
  "This is a preliminary AI-assisted analysis and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.";

const SYSTEM_PROMPT = `You are a medical triage assistant. Analyze the patient's symptoms and respond ONLY with a raw JSON object. No markdown, no code fences, no explanation — just the JSON object starting with { and ending with }.

Use EXACTLY this structure (all fields required):
{
  "urgencyLevel": "routine",
  "preliminarySuggestions": ["specific suggestion based on symptoms"],
  "possibleConditions": [
    { "name": "Condition Name", "likelihood": "high", "description": "Brief description" }
  ],
  "recommendedSpecialties": [
    { "specialty": "Specialty Name", "reason": "Why this specialty" }
  ],
  "selfCareAdvice": ["specific self-care tip"],
  "warningFlags": ["warning sign to watch for"],
  "disclaimer": "This is a preliminary AI-assisted analysis and is not a substitute for professional medical advice."
}

Rules:
- urgencyLevel MUST be exactly one of: "emergency", "urgent", "routine", "self-care"
- likelihood MUST be exactly one of: "high", "medium", "low"
- possibleConditions MUST be an array of objects with name, likelihood, description fields
- recommendedSpecialties MUST be an array of objects with specialty and reason fields
- Base every answer on the specific symptoms given — never use generic placeholder text`;

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

function extractJson(raw: string): string {
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

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

function normalizeLikelihood(value: unknown): Likelihood {
  if (value === "high" || value === "medium" || value === "low") return value;
  if (typeof value === "number") {
    if (value >= 0.6) return "high";
    if (value >= 0.3) return "medium";
    return "low";
  }
  return "low";
}

function normalizeResponse(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) return parsed;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.possibleConditions)) {
    obj.possibleConditions = obj.possibleConditions.map((c: unknown) => {
      if (typeof c !== "object" || c === null) return c;
      const cond = c as Record<string, unknown>;
      return { ...cond, likelihood: normalizeLikelihood(cond.likelihood) };
    });
  }
  return obj;
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
  console.log(`[ai.service] Using model: ${model} @ ${process.env.AI_API_ENDPOINT}`);
  const userPrompt = buildUserPrompt(input);
  const startTime = Date.now();

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;

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

      parsed = normalizeResponse(parsed);

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

  return {
    aiResult: buildFallbackResult(),
    rawPrompt: userPrompt,
    aiModel: model,
    processingTimeMs: Date.now() - startTime,
    status: "partial",
  };
}
