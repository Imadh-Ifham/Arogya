import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["MONGODB_URI", "STRIPE_SECRET_KEY"] as const;

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
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
  kafka: {
    broker: process.env.KAFKA_BROKER || "",
    topicPaymentCompleted:
      process.env.KAFKA_TOPIC_PAYMENT_COMPLETED || "payment.completed",
  },
} as const;
