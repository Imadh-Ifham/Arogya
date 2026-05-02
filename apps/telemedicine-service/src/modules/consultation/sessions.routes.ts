import { Router } from "express";
import { createSessionHandler } from "./sessions.controller.js";

export const sessionsRouter = Router();

/**
 * POST /sessions
 *
 * Simplified session-creation endpoint consumed by appointment-service
 * when a patient books (or a doctor approves) an ONLINE appointment.
 *
 * Accepts: { appointmentId, patientId, doctorId, startsAt?, expirationHours? }
 * Returns: { meetingUrl }
 */
sessionsRouter.post("/", createSessionHandler);
