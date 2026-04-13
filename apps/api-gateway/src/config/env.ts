import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET!,
  services: {
    auth:        process.env.AUTH_SERVICE_URL!,
    appointment: process.env.APPOINTMENT_SERVICE_URL!,
  },
};