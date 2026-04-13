import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
    });
    console.log("[Database] MongoDB connected successfully");
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[Database] Connection closed on app termination");
  process.exit(0);
});
