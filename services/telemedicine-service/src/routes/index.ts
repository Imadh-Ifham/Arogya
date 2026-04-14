import { Router } from "express";
import { chatRouter } from "../modules/chat/chat.routes.js";
import { clinicalNotesRouter } from "../temp/clinical-notes/clinical-notes.routes.js";
import { consultationRouter } from "../modules/consultation/consultation.routes.js";
import { roomRouter } from "../modules/rooms/room.routes.js";
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
apiRouter.use("/chats", chatRouter);
