import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeSymptoms } from "../modules/ai/api/rest";
import type { AnalyzeResponse, Severity } from "../modules/ai/api/rest";
import Layout from "../components/Layout";

const COMMON_SYMPTOMS = [
  "Fever",
  "Headache",
  "Cough",
  "Chest pain",
  "Shortness of breath",
  "Fatigue",
  "Nausea",
  "Dizziness",
  "Back pain",
  "Joint pain",
  "Abdominal pain",
  "Sore throat",
];

const URGENCY_STYLES: Record<string, string> = {
  emergency: "text-red-700 bg-red-50 border-red-200",
  urgent: "text-amber-700 bg-amber-50 border-amber-200",
  routine: "text-teal bg-teal-light border-border",
  "self-care": "text-green-700 bg-green-50 border-green-200",
};

export default function SymptomCheckerPage() {
  const navigate = useNavigate();

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState<Severity>("mild");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  };

  const addCustomSymptom = () => {
    const trimmed = customSymptom.trim();
    if (trimmed && !selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms((prev) => [...prev, trimmed]);
    }
    setCustomSymptom("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      setError("Please select at least one symptom.");
      return;
    }
    if (!duration.trim()) {
      setError("Please enter how long you have had these symptoms.");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const response = await analyzeSymptoms({
        symptoms: selectedSymptoms,
        duration,
        severity,
        additionalNotes: additionalNotes || undefined,
      });
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchBySpecialty = (specialty: string) => {
    navigate(`/search?specialty=${encodeURIComponent(specialty)}`);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">AI Symptom Checker</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Describe your symptoms and get preliminary guidance. This is not a medical diagnosis.
        </p>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Symptom chips */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-foreground mb-3">Select your symptoms</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_SYMPTOMS.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => toggleSymptom(symptom)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedSymptoms.includes(symptom)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSymptom();
                    }
                  }}
                  placeholder="Add custom symptom…"
                  className="flex-1 border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={addCustomSymptom}
                  className="border border-border text-foreground text-sm px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  Add
                </button>
              </div>

              {selectedSymptoms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedSymptoms.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 text-xs bg-secondary text-foreground border border-border px-2.5 py-1 rounded-full"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSymptom(s)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                How long have you had these symptoms?
              </label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 3 days, 1 week"
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Severity</label>
              <div className="flex gap-3">
                {(["mild", "moderate", "severe"] as Severity[]).map((level) => (
                  <label
                    key={level}
                    className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm cursor-pointer transition-colors capitalize ${
                      severity === level
                        ? "border-border bg-secondary text-foreground font-medium"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={level}
                      checked={severity === level}
                      onChange={() => setSeverity(level)}
                      className="sr-only"
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Additional notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                className="w-full border border-border bg-input-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Any relevant medical history, medications, etc."
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Analyzing…" : "Analyze Symptoms"}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              This tool provides general guidance only and does not replace professional medical advice.
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Urgency banner */}
            <div
              className={`border rounded-xl px-5 py-4 ${URGENCY_STYLES[result.urgencyLevel] ?? URGENCY_STYLES.routine}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-0.5">Urgency level</p>
              <p className="text-lg font-bold capitalize">{result.urgencyLevel}</p>
            </div>

            {/* AI unavailable notice */}
            {result.status === "partial" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-amber-700 mb-1">AI analysis unavailable</p>
                <p className="text-xs text-amber-600">
                  The AI service could not process your symptoms at this time. The results below are
                  generic defaults — please consult a healthcare provider directly.
                </p>
              </div>
            )}

            {/* Warning flags */}
            {result.warningFlags.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-red-700 mb-2">Warning signs</p>
                <ul className="space-y-1">
                  {result.warningFlags.map((flag, i) => (
                    <li key={i} className="text-sm text-red-600 flex gap-2">
                      <span>•</span> {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preliminary suggestions */}
            {result.preliminarySuggestions.length > 0 && (
              <div className="bg-card border border-border rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-foreground mb-2">Preliminary guidance</p>
                <ul className="space-y-1">
                  {result.preliminarySuggestions.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended specialties */}
            {result.recommendedSpecialties.length > 0 && (
              <div className="bg-card border border-border rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-foreground mb-3">Recommended specialties</p>
                <div className="space-y-2">
                  {result.recommendedSpecialties.map((sp) => (
                    <div
                      key={sp.code}
                      className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{sp.specialty}</p>
                        <p className="text-xs text-muted-foreground">{sp.reason}</p>
                      </div>
                      <button
                        onClick={() => handleSearchBySpecialty(sp.specialty)}
                        className="text-xs text-teal hover:underline whitespace-nowrap"
                      >
                        Find doctors →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Possible conditions */}
            {result.possibleConditions.length > 0 && (
              <div className="bg-card border border-border rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-foreground mb-3">Possible conditions</p>
                <div className="space-y-2">
                  {result.possibleConditions.map((c) => (
                    <div key={c.name} className="flex items-start gap-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-0.5 ${
                          c.likelihood === "high"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : c.likelihood === "medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {c.likelihood}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Self-care advice */}
            {result.selfCareAdvice.length > 0 && (
              <div className="bg-card border border-border rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-foreground mb-2">Self-care tips</p>
                <ul className="space-y-1">
                  {result.selfCareAdvice.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.disclaimer && (
              <p className="text-xs text-muted-foreground/70 text-center">{result.disclaimer}</p>
            )}

            <button
              onClick={() => setResult(null)}
              className="w-full border border-border text-foreground text-sm py-2.5 rounded-lg hover:bg-secondary transition-colors"
            >
              Check again
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
