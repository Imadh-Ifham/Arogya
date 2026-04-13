import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "test" | "production";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = (process.env.NODE_ENV ?? "development") as NodeEnv;

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 8086),
  serviceName: process.env.SERVICE_NAME ?? "telemedicine-service",
  mongodbUri: required("MONGODB_URI"),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 5000),
  services: {
    patient: required("PATIENT_SERVICE_URL"),
    doctor: required("DOCTOR_SERVICE_URL"),
    appointment: required("APPOINTMENT_SERVICE_URL"),
  },
};
