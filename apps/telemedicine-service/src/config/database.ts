import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../shared/logger.js";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  logger.info("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
