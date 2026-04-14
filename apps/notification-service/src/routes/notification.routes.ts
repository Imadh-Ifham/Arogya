import { Router } from "express";
import {
  sendNotificationController,
  listLogsController,
  getLogController,
} from "../controllers/notification.controller";

const router = Router();

// ─── Dispatch endpoint — called by other services ─────────────────────────────
//
// POST /api/notifications/send
//
// API Contract for callers:
//
//   Appointment Service → APPOINTMENT_CONFIRMATION / APPOINTMENT_REMINDER / APPOINTMENT_CANCELLATION
//   {
//     "eventType": "APPOINTMENT_CONFIRMATION",
//     "patientId": "<Spring Boot patient UUID>",   // OR supply recipientEmail directly
//     "templateVariables": {
//       "appointmentDate": "2026-04-20 10:00 AM",
//       "doctorName": "Dr. Perera",
//       "appointmentType": "ONLINE"
//     }
//   }
//
//   Payment Service → PAYMENT_RECEIPT
//   {
//     "eventType": "PAYMENT_RECEIPT",
//     "patientId": "<patient UUID>",
//     "templateVariables": {
//       "amount": "LKR 2,500",
//       "paymentId": "PAY-XYZ",
//       "appointmentDate": "2026-04-20 10:00 AM"
//     }
//   }
//
//   Prescription Service → PRESCRIPTION_DELIVERY
//   {
//     "eventType": "PRESCRIPTION_DELIVERY",
//     "patientId": "<patient UUID>",
//     "templateVariables": {
//       "prescriptionId": "RX-123",
//       "doctorName": "Dr. Perera",
//       "issuedDate": "2026-04-14"
//     }
//   }
//
//   Custom / Ad-hoc email
//   {
//     "eventType": "CUSTOM",
//     "recipientEmail": "patient@example.com",
//     "customSubject": "Important update",
//     "customBody": "<p>Your message here</p>"
//   }

router.post("/send", sendNotificationController);

// ─── Audit log ────────────────────────────────────────────────────────────────
// GET /api/notifications/logs?patientId=&eventType=&status=&channel=&page=&limit=
router.get("/logs", listLogsController);

// GET /api/notifications/logs/:id
router.get("/logs/:id", getLogController);

export default router;
