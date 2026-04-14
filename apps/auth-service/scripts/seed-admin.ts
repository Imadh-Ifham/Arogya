/**
 * Seed an admin user into the Arogya auth database.
 *
 * Usage (from apps/auth-service directory):
 *   npx ts-node scripts/seed-admin.ts
 *
 * Credentials can be overridden with env vars:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=MySecret npx ts-node scripts/seed-admin.ts
 *
 * The script is idempotent — running it twice is safe.
 */

import dotenv from "dotenv";
import path from "path";

// Load .env before any module that reads process.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI   = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL    ?? "admin@arogya.com";
const ADMIN_PASS  = process.env.ADMIN_PASSWORD ?? "Admin@1234";

if (!MONGO_URI) {
  console.error("ERROR: MONGODB_URI is not set. Check apps/auth-service/.env");
  process.exit(1);
}

// Minimal schema — mirrors user.model.ts without importing env-dependent modules
const userSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role:         { type: String, required: true },
    firstName:    { type: String, required: true },
    lastName:     { type: String },
    phoneNumber:  { type: String },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true },
);

async function main() {
  await mongoose.connect(MONGO_URI!);
  console.log("Connected to MongoDB");

  // Use existing model if already registered (e.g. in test envs)
  const User = mongoose.models["User"] ?? mongoose.model("User", userSchema);

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASS, 12);

  await User.create({
    email:        ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role:         "admin",
    firstName:    "Admin",
    isActive:     true,
  });

  console.log("Admin user created successfully:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASS}`);
  console.log("Change the password after first login.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
