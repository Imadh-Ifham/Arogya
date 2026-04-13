import { Router } from "express";
import { consultationRouter } from "../modules/consultation/consultation.routes.js";
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

apiRouter.use("/consultations", consultationRouter);
