import { Request, Response, NextFunction } from "express";
import * as notificationService from "../services/notification.service";
import { sendSuccess } from "../utils/apiResponse.util";
import { SendNotificationDto } from "../types/notification.types";

// ─── Send notification ────────────────────────────────────────────────────────
// Called by Appointment, Payment, and Prescription services.
//
// Minimal required body:
//   { eventType: "APPOINTMENT_CONFIRMATION", patientId: "..." }
//
// Caller may also supply contact fields directly if it already has them:
//   { eventType: "APPOINTMENT_CONFIRMATION", recipientPhone: "+94...", recipientEmail: "..." }
//
// Template variables are merged with recipientName automatically:
//   { eventType: "APPOINTMENT_CONFIRMATION", patientId: "...", templateVariables: { appointmentDate: "..." } }

export const sendNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: SendNotificationDto = req.body;
    const logs = await notificationService.sendNotification(dto);
    sendSuccess(res, logs, "Notification dispatched", 201);
  } catch (err) {
    next(err);
  }
};

// ─── Audit log — list ─────────────────────────────────────────────────────────
// GET /api/notifications/logs
// Query params: patientId, eventType, status, channel, page, limit

export const listLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { patientId, eventType, status, channel, page, limit } =
      req.query as Record<string, string>;

    const result = await notificationService.queryLogs({
      patientId,
      eventType,
      status,
      channel,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    sendSuccess(res, result, "Logs fetched");
  } catch (err) {
    next(err);
  }
};

// ─── Audit log — single entry ─────────────────────────────────────────────────
// GET /api/notifications/logs/:id

export const getLogController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const log = await notificationService.getLogById(req.params.id);
    sendSuccess(res, log, "Log fetched");
  } catch (err) {
    next(err);
  }
};
