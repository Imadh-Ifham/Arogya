import type { EnrichedSpecialty, UrgencyLevel, RecommendedSpecialty } from "../types/analysis.types";

// Re-export for convenience
export type { EnrichedSpecialty };

const SPECIALTY_MAP: Record<string, string> = {
  "General Physician": "GENERAL",
  "Neurologist": "NEURO",
  "Cardiologist": "CARDIO",
  "Pulmonologist": "PULMO",
  "Gastroenterologist": "GASTRO",
  "Dermatologist": "DERM",
  "Orthopedist": "ORTHO",
  "Psychiatrist": "PSYCH",
  "ENT Specialist": "ENT",
  "Ophthalmologist": "OPHTHAL",
  "Gynecologist": "GYNEC",
  "Pediatrician": "PEDI",
  "Urologist": "URO",
  "Endocrinologist": "ENDO",
  "Emergency Medicine": "EMERGENCY",
};

const EMERGENCY_ENTRY: EnrichedSpecialty = {
  specialty: "Emergency Medicine",
  code: "EMERGENCY",
  reason: "Urgency level indicates a potential emergency requiring immediate evaluation.",
  priority: "high",
};

export function enrichSpecialties(
  specialties: RecommendedSpecialty[],
  urgencyLevel: UrgencyLevel
): EnrichedSpecialty[] {
  const isHighPriority =
    urgencyLevel === "emergency" || urgencyLevel === "urgent";

  const enriched: EnrichedSpecialty[] = specialties.map((s) => ({
    specialty: s.specialty,
    code: SPECIALTY_MAP[s.specialty] ?? "GENERAL",
    reason: s.reason,
    priority: isHighPriority ? "high" : "normal",
  }));

  if (urgencyLevel === "emergency") {
    // Prepend Emergency Medicine if not already first
    const alreadyFirst = enriched[0]?.code === "EMERGENCY";
    if (!alreadyFirst) {
      enriched.unshift(EMERGENCY_ENTRY);
    }
  }

  return enriched;
}
