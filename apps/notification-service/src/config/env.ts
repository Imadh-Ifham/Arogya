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

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    fromNumber: process.env.TWILIO_FROM_NUMBER || "",
    enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@arogya.health",
    fromName: process.env.SENDGRID_FROM_NAME || "Arogya Health",
    enabled: !!process.env.SENDGRID_API_KEY,
  },

  // Generic SMTP (e.g. Gmail) — takes priority over SendGrid when set.
  // For Gmail: enable "App Passwords" and use the 16-char app password here.
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    enabled: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  },

  // Ethereal SMTP — fallback fake inbox for dev/CI (no real emails sent).
  // Get credentials at https://ethereal.email
  ethereal: {
    host: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.ETHEREAL_PORT || "587", 10),
    user: process.env.ETHEREAL_USER || "",
    pass: process.env.ETHEREAL_PASS || "",
    enabled: !!(process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS),
  },

  // Internal service URLs — used when resolving contact details
  patientServiceUrl:
    process.env.PATIENT_SERVICE_URL || "http://localhost:8082",
  doctorServiceUrl:
    process.env.DOCTOR_SERVICE_URL || "http://localhost:8083",
  authServiceUrl:
    process.env.AUTH_SERVICE_URL || "http://localhost:8081",

  // Max attempts before giving up on a third-party API call
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || "3", 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || "1000", 10),
} as const;
