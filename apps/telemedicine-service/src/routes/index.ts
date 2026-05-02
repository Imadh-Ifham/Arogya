import { Router } from "express";
import { chatRouter } from "../modules/chat/chat.routes.js";
import { clinicalNotesRouter } from "../modules/clinical-notes/clinical-notes.routes.js";
import { consultationRouter } from "../modules/consultation/consultation.routes.js";
import { roomRouter } from "../modules/rooms/room.routes.js";
import { sessionsRouter } from "../modules/consultation/sessions.routes.js";
import { env } from "../config/env.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: env.serviceName,
      uptime: process.uptime(),
    },
  });
});

apiRouter.use("/rooms", roomRouter);
apiRouter.use("/consultations", clinicalNotesRouter);
apiRouter.use("/consultations", consultationRouter);
// Legacy endpoint used by appointment-service to create a session on booking/approval
apiRouter.use("/sessions", sessionsRouter);
apiRouter.use("/chats", chatRouter);
