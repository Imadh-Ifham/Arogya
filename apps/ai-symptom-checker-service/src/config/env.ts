import "dotenv/config";

const REQUIRED_VARS = [
  "PORT",
  "MONGO_URI",
  "JWT_SECRET",
  "AI_API_KEY",
  "AI_API_ENDPOINT",
  "AI_MODEL",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(", ")}`);
  }
}
