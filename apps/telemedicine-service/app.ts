import cors from "cors";
import express, { type Request, type Response } from "express";
import { apiRouter } from "./src/routes/index.js";
import { logger } from "./src/shared/logger.js";
import { errorHandler } from "./src/shared/http/error-handler.js";
import { notFoundHandler } from "./src/shared/http/not-found.js";

export function buildApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, "Incoming request");
    next();
  });

  /**
   * Internal service-to-service endpoint called by appointment-service when a
   * patient books or a doctor approves an ONLINE appointment.
   *
   * POST /api/sessions
   * Body: { appointmentId, patientId, doctorId, startsAt? }
   * Response: { meetingUrl }
   *
   * Creates a full Consultation + Room document so the session appears on the
   * telemedicine dashboard. Idempotent: returns the existing meetingUrl if a
   * consultation for this appointmentId already exists.
   */
  app.post("/api/sessions", async (req: Request, res: Response) => {
    const { appointmentId, patientId, doctorId, startsAt } = req.body as {
      appointmentId?: string;
      patientId?: string;
      doctorId?: string;
      startsAt?: string;
    };

    if (!appointmentId || !patientId || !doctorId) {
      res.status(400).json({ error: "appointmentId, patientId and doctorId are required" });
      return;
    }

    try {
      const { createConsultationSession, getConsultationByAppointmentId } = await import(
        "./src/modules/consultation/consultation.service.js"
      );

      // Idempotent: return existing session if already created
      const existing = await getConsultationByAppointmentId(appointmentId);
      if (existing) {
        logger.info(
          { appointmentId, consultationId: existing.id },
          "Session already exists — returning existing meetingUrl",
        );
        res.status(200).json({ meetingUrl: existing.room.jitsiRoomUrl });
        return;
      }

      const resolvedStartsAt = startsAt ? new Date(startsAt) : new Date();
      const consultation = await createConsultationSession({
        appointmentId,
        patientId,
        doctorId,
        startsAt: resolvedStartsAt,
        expirationHours: 2,
      });

      logger.info(
        { appointmentId, patientId, doctorId, roomKey: consultation.room.roomKey },
        "Consultation and room created for appointment booking",
      );
      res.status(200).json({ meetingUrl: consultation.room.jitsiRoomUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      logger.error({ err, appointmentId, patientId, doctorId }, "Failed to create consultation session");
      res.status(500).json({ error: message });
    }
  });

  app.use("/api/v1/telemedicine", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
