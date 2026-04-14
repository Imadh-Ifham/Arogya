import sgMail from "@sendgrid/mail";
import { env } from "../config/env";
import { SendEmailDto } from "../types/notification.types";

if (env.sendgrid.enabled) {
  sgMail.setApiKey(env.sendgrid.apiKey);
}

export interface EmailResult {
  success: boolean;
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
}

/**
 * Sends an email via SendGrid with up to `maxAttempts` retries.
 * Falls back to console logging when a SendGrid API key is not configured.
 */
export const sendEmail = async (
  dto: SendEmailDto,
  maxAttempts = env.retryAttempts,
): Promise<EmailResult> => {
  if (!env.sendgrid.enabled) {
    console.log(
      `[EMAIL-STUB] To: ${dto.to} | Subject: ${dto.subject}\n${dto.textBody ?? dto.htmlBody}`,
    );
    return {
      success: true,
      providerMessageId: `STUB-EMAIL-${Date.now()}`,
      providerResponse: JSON.stringify({ stub: true }),
    };
  }

  const msg: sgMail.MailDataRequired = {
    to: { email: dto.to, name: dto.toName },
    from: { email: env.sendgrid.fromEmail, name: env.sendgrid.fromName },
    subject: dto.subject,
    html: dto.htmlBody,
    text: dto.textBody ?? stripHtml(dto.htmlBody),
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const [response] = await sgMail.send(msg);

      return {
        success: true,
        providerMessageId: response.headers["x-message-id"] as string | undefined,
        providerResponse: JSON.stringify({ statusCode: response.statusCode }),
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isRetryable = isTransientError(err);
      if (!isRetryable || attempt === maxAttempts) break;

      const delay = env.retryDelayMs * attempt;
      console.warn(
        `[EMAIL] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
        lastError.message,
      );
      await sleep(delay);
    }
  }

  return {
    success: false,
    errorMessage: lastError?.message ?? "Unknown email error",
  };
};

// SendGrid HTTP 429 (rate limit) and 5xx are retryable
const isTransientError = (err: unknown): boolean => {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: number }).code;
    return code === 429 || code >= 500;
  }
  return false;
};

// Basic HTML stripper for plain-text fallback
const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
