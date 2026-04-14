import twilio from "twilio";
import { env } from "../config/env";
import { SendSmsDto } from "../types/notification.types";

// Twilio client is only instantiated when credentials are present.
// In development / CI, credentials are left empty and the provider
// logs the SMS body to stdout instead of making a real API call.
let twilioClient: ReturnType<typeof twilio> | null = null;

if (env.twilio.enabled) {
  twilioClient = twilio(env.twilio.accountSid, env.twilio.authToken);
}

export interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
}

/**
 * Sends an SMS via Twilio with up to `maxAttempts` retries on transient errors.
 * Falls back to console logging when Twilio credentials are not configured.
 */
export const sendSms = async (
  dto: SendSmsDto,
  maxAttempts = env.retryAttempts,
): Promise<SmsResult> => {
  if (!env.twilio.enabled) {
    // Development fallback — never fails, logs payload for inspection
    console.log(
      `[SMS-STUB] To: ${dto.to} | Body: ${dto.body}`,
    );
    return {
      success: true,
      providerMessageId: `STUB-SMS-${Date.now()}`,
      providerResponse: JSON.stringify({ stub: true }),
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const message = await twilioClient!.messages.create({
        to: dto.to,
        from: env.twilio.fromNumber,
        body: dto.body,
      });

      return {
        success: true,
        providerMessageId: message.sid,
        providerResponse: JSON.stringify({ status: message.status }),
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on network / rate-limit errors, not on invalid number etc.
      const isRetryable = isTransientError(err);
      if (!isRetryable || attempt === maxAttempts) break;

      const delay = env.retryDelayMs * attempt; // exponential back-off
      console.warn(
        `[SMS] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
        lastError.message,
      );
      await sleep(delay);
    }
  }

  return {
    success: false,
    errorMessage: lastError?.message ?? "Unknown SMS error",
  };
};

// Twilio error codes for transient failures (rate limits, network timeouts)
const TRANSIENT_TWILIO_CODES = new Set([20429, 20003, 30007, 30008]);

const isTransientError = (err: unknown): boolean => {
  if (err && typeof err === "object" && "code" in err) {
    return TRANSIENT_TWILIO_CODES.has((err as { code: number }).code);
  }
  return false;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
