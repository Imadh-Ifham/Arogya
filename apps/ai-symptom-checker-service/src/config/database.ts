import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGO_URI as string;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log(
        `[database] Connected to MongoDB successfully (attempt ${attempt})`
      );
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[database] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`
      );

      if (attempt < MAX_RETRIES) {
        console.log(`[database] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `[database] Failed to connect to MongoDB after ${MAX_RETRIES} attempts`
  );
}
