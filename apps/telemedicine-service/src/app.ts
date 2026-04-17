import cors from "cors";
import express, { type Request, type Response } from "express";
import { apiRouter } from "./routes/index.js";
import { logger } from "./shared/logger.js";
import { errorHandler } from "./shared/http/error-handler.js";
import { notFoundHandler } from "./shared/http/not-found.js";
import { getOrCreateUsableRoomByParticipants } from "./modules/rooms/room.service.js";

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
   * patient books an ONLINE appointment.
   *
   * POST /api/sessions
   * Body: { appointmentId, patientId, doctorId }
   * Response: { meetingUrl }
   */
  app.post("/api/sessions", async (req: Request, res: Response) => {
    const { appointmentId, patientId, doctorId } = req.body as {
      appointmentId?: string;
      patientId?: string;
      doctorId?: string;
    };

    if (!appointmentId || !patientId || !doctorId) {
      res
        .status(400)
        .json({ error: "appointmentId, patientId and doctorId are required" });
      return;
    }

    try {
      const room = await getOrCreateUsableRoomByParticipants(
        doctorId,
        patientId,
      );
      logger.info(
        { appointmentId, patientId, doctorId, roomKey: room.roomKey },
        "Session room resolved for appointment booking",
      );
      res.status(200).json({ meetingUrl: room.jitsiRoomUrl });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      logger.error(
        { err, appointmentId, patientId, doctorId },
        "Failed to resolve session room",
      );
      res.status(500).json({ error: message });
    }
  });

  app.use("/api/v1/telemedicine", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
