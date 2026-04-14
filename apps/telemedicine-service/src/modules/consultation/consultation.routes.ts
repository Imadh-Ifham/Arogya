import { Router } from "express";
import {
  createConsultationHandler,
  getConsultationsByDoctorIdHandler,
  getConsultationsByPatientIdHandler,
  getConsultationByIdHandler,
  listConsultationsHandler,
  updateConsultationStatusHandler,
} from "./consultation.controller.js";

export const consultationRouter = Router();

consultationRouter.get("/", listConsultationsHandler);
consultationRouter.get("/doctor/:doctorId", getConsultationsByDoctorIdHandler);
consultationRouter.get(
  "/patient/:patientId",
  getConsultationsByPatientIdHandler,
);
consultationRouter.get("/:id", getConsultationByIdHandler);
consultationRouter.post("/", createConsultationHandler);
consultationRouter.patch("/:id/status", updateConsultationStatusHandler);
