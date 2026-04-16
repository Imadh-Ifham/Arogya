import { Router } from "express";
import {
  createConsultationHandler,
  getConsultationsByDoctorIdHandler,
  getConsultationsByPatientIdHandler,
  getConsultationByIdHandler,
  getConsultationByAppointmentIdHandler,
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
// Lookup by appointmentId — avoids full list fetch + client-side filter
consultationRouter.get("/by-appointment/:appointmentId", getConsultationByAppointmentIdHandler);
consultationRouter.get("/:id", getConsultationByIdHandler);
consultationRouter.post("/", createConsultationHandler);
consultationRouter.patch("/:id/status", updateConsultationStatusHandler);
