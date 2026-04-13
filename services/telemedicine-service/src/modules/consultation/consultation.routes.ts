import { Router } from "express";
import {
  createRoomHandler,
  createConsultationHandler,
  getConsultationByIdHandler,
  listConsultationsHandler,
  reopenRoomHandler,
  updateConsultationStatusHandler,
} from "./consultation.controller.js";

export const consultationRouter = Router();

consultationRouter.post("/rooms", createRoomHandler);
consultationRouter.patch("/rooms/:roomKey/reopen", reopenRoomHandler);
consultationRouter.get("/", listConsultationsHandler);
consultationRouter.get("/:id", getConsultationByIdHandler);
consultationRouter.post("/", createConsultationHandler);
consultationRouter.patch("/:id/status", updateConsultationStatusHandler);
