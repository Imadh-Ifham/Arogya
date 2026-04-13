import { Router } from "express";
import {
  createConsultationHandler,
  getConsultationByIdHandler,
  listConsultationsHandler,
  updateConsultationStatusHandler,
} from "./consultation.controller.js";

export const consultationRouter = Router();

consultationRouter.get("/", listConsultationsHandler);
consultationRouter.get("/:id", getConsultationByIdHandler);
consultationRouter.post("/", createConsultationHandler);
consultationRouter.patch("/:id/status", updateConsultationStatusHandler);
