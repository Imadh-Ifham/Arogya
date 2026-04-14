import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["MONGODB_URI"] as const;

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3002", 10),
  mongodbUri: process.env.MONGODB_URI!,

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@arogya.health",
    fromName: process.env.SENDGRID_FROM_NAME || "Arogya Health",
    enabled: !!process.env.SENDGRID_API_KEY,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    fromNumber: process.env.TWILIO_FROM_NUMBER || "",
    enabled:
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_FROM_NUMBER,
  },

  // Internal service URLs — used when resolving patient contact details
  patientServiceUrl:
    process.env.PATIENT_SERVICE_URL || "http://localhost:8082",

  // Max attempts before giving up on a third-party API call
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || "3", 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || "1000", 10),
} as const;
