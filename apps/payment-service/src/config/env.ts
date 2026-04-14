import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["MONGODB_URI"] as const;

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "[Payment] STRIPE_SECRET_KEY not set — Stripe calls will fail at runtime. Set it to enable payment processing.",
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "8087", 10),
  mongodbUri: process.env.MONGODB_URI!,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  // URL of appointment-service — used to callback after Stripe webhook events.
  // In Docker: http://appointment-service:8084
  // In dev:    http://localhost:8084
  appointmentServiceUrl:
    process.env.APPOINTMENT_SERVICE_URL || "http://localhost:8084",

  kafka: {
    broker: process.env.KAFKA_BROKER || "",
    topicPaymentCompleted:
      process.env.KAFKA_TOPIC_PAYMENT_COMPLETED || "payment.completed",
  },
} as const;
