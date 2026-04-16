import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("[DB] Connected to MongoDB");
  } catch (err) {
    console.error("[DB] Connection failed:", err);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected");
  });
};

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[DB] Connection closed on app termination");
  process.exit(0);
});
