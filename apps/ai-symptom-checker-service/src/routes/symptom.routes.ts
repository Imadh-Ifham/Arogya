import type { FastifyInstance, FastifyRequest, FastifyReply, RouteShorthandOptions } from "fastify";
import { analyzeSymptoms } from "../services/ai.service";
import { enrichSpecialties } from "../services/specialty.service";
import { AnalysisSession } from "../models/analysis-session.model";
import type { SymptomInput, AnalyzeResponse } from "../types/analysis.types";

type AuthenticateHook = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void>;

// ─── JSON Schemas ─────────────────────────────────────────────────────────────

const analyzeBodySchema = {
  type: "object",
  required: ["symptoms", "duration", "severity"],
  additionalProperties: false,
  properties: {
    symptoms: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    duration: { type: "string", minLength: 1 },
    severity: { type: "string", enum: ["mild", "moderate", "severe"] },
    additionalNotes: { type: "string" },
    age: { type: "number", minimum: 0, maximum: 130 },
    gender: { type: "string", enum: ["male", "female", "other"] },
  },
} as const;

const historyQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
  },
} as const;

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function symptomRoutes(
  fastify: FastifyInstance,
  options: { authenticate: AuthenticateHook }
): Promise<void> {
  const { authenticate } = options;

  // POST /ai/analyze
  const analyzeOpts: RouteShorthandOptions = {
    preHandler: [authenticate],
    schema: {
      body: analyzeBodySchema,
    },
  };

  fastify.post("/analyze", analyzeOpts, async (request, reply) => {
    const user = request.user as {
      patientId?: string;
      userId?: string;
      sub?: string;
      id?: string;
    };
    const patientId =
      user.patientId ?? user.userId ?? user.sub ?? user.id ?? "unknown";

    const body = request.body as SymptomInput;

    let sessionStatus: "completed" | "failed" | "partial" = "completed";
    let errorMessage: string | undefined;

    let serviceResult;
    try {
      serviceResult = await analyzeSymptoms(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[POST /analyze] AI service threw unexpectedly:", msg);

      // Save failed session
      await AnalysisSession.create({
        sessionId: crypto.randomUUID(),
        patientId,
        symptoms: body.symptoms,
        duration: body.duration,
        severity: body.severity,
        additionalNotes: body.additionalNotes,
        patientContext: { age: body.age, gender: body.gender },
        aiResult: null,
        enrichedSpecialties: [],
        rawPrompt: "",
        aiModel: process.env.AI_MODEL ?? "unknown",
        processingTimeMs: 0,
        status: "failed",
        errorMessage: msg,
      }).catch((dbErr: unknown) => {
        console.error("[POST /analyze] Failed to save error session:", dbErr);
      });

      return reply.code(502).send({ error: "AI analysis service is currently unavailable." });
    }

    if (serviceResult.status === "partial") {
      sessionStatus = "partial";
    }

    const enriched = enrichSpecialties(
      serviceResult.aiResult.recommendedSpecialties,
      serviceResult.aiResult.urgencyLevel
    );

    const analysisId = crypto.randomUUID();
    const now = new Date();

    try {
      await AnalysisSession.create({
        sessionId: analysisId,
        patientId,
        symptoms: body.symptoms,
        duration: body.duration,
        severity: body.severity,
        additionalNotes: body.additionalNotes,
        patientContext: { age: body.age, gender: body.gender },
        aiResult: serviceResult.aiResult,
        enrichedSpecialties: enriched,
        rawPrompt: serviceResult.rawPrompt,
        aiModel: serviceResult.aiModel,
        processingTimeMs: serviceResult.processingTimeMs,
        status: sessionStatus,
        errorMessage,
      });
    } catch (dbErr) {
      console.error("[POST /analyze] Failed to persist session:", dbErr);
      // Don't fail the HTTP response — analysis succeeded
    }

    const response: AnalyzeResponse = {
      analysisId,
      patientId,
      urgencyLevel: serviceResult.aiResult.urgencyLevel,
      preliminarySuggestions: serviceResult.aiResult.preliminarySuggestions,
      possibleConditions: serviceResult.aiResult.possibleConditions,
      recommendedSpecialties: enriched,
      selfCareAdvice: serviceResult.aiResult.selfCareAdvice,
      warningFlags: serviceResult.aiResult.warningFlags,
      disclaimer: serviceResult.aiResult.disclaimer,
      processingTimeMs: serviceResult.processingTimeMs,
      createdAt: now.toISOString(),
    };

    return reply.code(200).send(response);
  });

  // GET /ai/history/:patientId
  const historyOpts: RouteShorthandOptions = {
    preHandler: [authenticate],
    schema: {
      querystring: historyQuerySchema,
    },
  };

  fastify.get("/history/:patientId", historyOpts, async (request, reply) => {
    const user = request.user as {
      patientId?: string;
      userId?: string;
      sub?: string;
      id?: string;
    };
    const tokenPatientId =
      user.patientId ?? user.userId ?? user.sub ?? user.id ?? "unknown";

    const { patientId } = request.params as { patientId: string };

    if (tokenPatientId !== patientId) {
      return reply.code(403).send({ error: "Forbidden: you may only access your own history." });
    }

    const query = request.query as { page: number; limit: number };
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 50);
    const skip = (page - 1) * limit;

    try {
      const [sessions, total] = await Promise.all([
        AnalysisSession.find({ patientId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AnalysisSession.countDocuments({ patientId }),
      ]);

      const data: AnalyzeResponse[] = sessions.map((s) => ({
        analysisId: s.sessionId,
        patientId: s.patientId,
        urgencyLevel: (s.aiResult as { urgencyLevel?: string } | null)?.urgencyLevel ?? "routine",
        preliminarySuggestions:
          (s.aiResult as { preliminarySuggestions?: string[] } | null)?.preliminarySuggestions ?? [],
        possibleConditions:
          (s.aiResult as { possibleConditions?: AnalyzeResponse["possibleConditions"] } | null)
            ?.possibleConditions ?? [],
        recommendedSpecialties: (s.enrichedSpecialties as AnalyzeResponse["recommendedSpecialties"]) ?? [],
        selfCareAdvice:
          (s.aiResult as { selfCareAdvice?: string[] } | null)?.selfCareAdvice ?? [],
        warningFlags:
          (s.aiResult as { warningFlags?: string[] } | null)?.warningFlags ?? [],
        disclaimer:
          (s.aiResult as { disclaimer?: string } | null)?.disclaimer ?? "",
        processingTimeMs: s.processingTimeMs,
        createdAt: (s.createdAt as Date).toISOString(),
      }));

      return reply.code(200).send({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("[GET /history] DB error:", err instanceof Error ? err.message : String(err));
      return reply.code(500).send({ error: "Failed to retrieve history." });
    }
  });

  // GET /ai/analysis/:analysisId
  const getAnalysisOpts: RouteShorthandOptions = {
    preHandler: [authenticate],
  };

  fastify.get("/analysis/:analysisId", getAnalysisOpts, async (request, reply) => {
    const user = request.user as {
      patientId?: string;
      userId?: string;
      sub?: string;
      id?: string;
    };
    const tokenPatientId =
      user.patientId ?? user.userId ?? user.sub ?? user.id ?? "unknown";

    const { analysisId } = request.params as { analysisId: string };

    try {
      const session = await AnalysisSession.findOne({ sessionId: analysisId }).lean();

      if (!session) {
        return reply.code(404).send({ error: "Analysis not found." });
      }

      if (session.patientId !== tokenPatientId) {
        return reply.code(403).send({ error: "Forbidden: this analysis does not belong to you." });
      }

      const response: AnalyzeResponse = {
        analysisId: session.sessionId,
        patientId: session.patientId,
        urgencyLevel:
          (session.aiResult as { urgencyLevel?: string } | null)?.urgencyLevel ?? "routine",
        preliminarySuggestions:
          (session.aiResult as { preliminarySuggestions?: string[] } | null)
            ?.preliminarySuggestions ?? [],
        possibleConditions:
          (session.aiResult as { possibleConditions?: AnalyzeResponse["possibleConditions"] } | null)
            ?.possibleConditions ?? [],
        recommendedSpecialties:
          (session.enrichedSpecialties as AnalyzeResponse["recommendedSpecialties"]) ?? [],
        selfCareAdvice:
          (session.aiResult as { selfCareAdvice?: string[] } | null)?.selfCareAdvice ?? [],
        warningFlags:
          (session.aiResult as { warningFlags?: string[] } | null)?.warningFlags ?? [],
        disclaimer:
          (session.aiResult as { disclaimer?: string } | null)?.disclaimer ?? "",
        processingTimeMs: session.processingTimeMs,
        createdAt: (session.createdAt as Date).toISOString(),
      };

      return reply.code(200).send(response);
    } catch (err) {
      console.error("[GET /analysis] DB error:", err instanceof Error ? err.message : String(err));
      return reply.code(500).send({ error: "Failed to retrieve analysis." });
    }
  });
}
