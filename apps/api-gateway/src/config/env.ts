import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET!,
  services: {
    auth:         process.env.AUTH_SERVICE_URL!,
    patient:      process.env.PATIENT_SERVICE_URL!,
    doctor:       process.env.DOCTOR_SERVICE_URL!,
    appointment:  process.env.APPOINTMENT_SERVICE_URL!,
    telemedicine: process.env.TELEMEDICINE_SERVICE_URL!,
    ai:           process.env.AI_SERVICE_URL!,
    notification: process.env.NOTIFICATION_SERVICE_URL!,
    payment:      process.env.PAYMENT_SERVICE_URL!,
  },
};