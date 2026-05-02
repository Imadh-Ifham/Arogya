import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/index.js";
import { logger } from "./shared/logger.js";
import { errorHandler } from "./shared/http/error-handler.js";
import { notFoundHandler } from "./shared/http/not-found.js";
import { createSessionHandler } from "./modules/consultation/sessions.controller.js";

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
  app.post("/api/sessions", createSessionHandler);

  app.use("/api/v1/telemedicine", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
