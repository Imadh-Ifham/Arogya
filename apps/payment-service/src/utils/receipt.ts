import crypto from "crypto";

/**
 * Generates a receipt number in format: RCP-YYYYMMDD-XXXX
 * Example: RCP-20260414-A3F2
 */
export const generateReceiptNumber = (): string => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hex = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `RCP-${y}${m}${d}-${hex}`;
};
