import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { SendEmailDto } from "../types/notification.types";

// ─── Provider selection ───────────────────────────────────────────────────────
// Priority (first match wins):
//   1. SMTP_USER + SMTP_PASS set        → Nodemailer SMTP (Gmail / any SMTP)
//   2. SendGrid key set                 → SendGrid
//   3. Ethereal creds set               → Ethereal fake inbox (dev catch-all)
//   4. Fallback                         → console stub (never fails)

if (env.sendgrid.enabled) {
  sgMail.setApiKey(env.sendgrid.apiKey);
}

// Nodemailer transporter — used for SMTP (Gmail) or Ethereal
const smtpTransport =
  env.smtp.enabled
    ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      })
    : env.ethereal.enabled
    ? nodemailer.createTransport({
        host: env.ethereal.host,
        port: env.ethereal.port,
        auth: { user: env.ethereal.user, pass: env.ethereal.pass },
      })
    : null;

const smtpFromEmail = env.smtp.enabled ? env.smtp.user : env.sendgrid.fromEmail;
const smtpFromName  = env.sendgrid.fromName;

export interface EmailResult {
  success: boolean;
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
  // In development, Ethereal returns a URL where you can view the email
  previewUrl?: string;
}

export const sendEmail = async (
  dto: SendEmailDto,
  maxAttempts = env.retryAttempts,
): Promise<EmailResult> => {
  // ── SMTP / Ethereal (Nodemailer) ────────────────────────────────────────────
  if (smtpTransport) {
    return sendViaSmtp(dto);
  }

  // ── SendGrid ────────────────────────────────────────────────────────────────
  if (env.sendgrid.enabled) {
    return sendViaSendGrid(dto, maxAttempts);
  }

  // ── Console stub (fallback) ─────────────────────────────────────────────────
  console.log(
    `[EMAIL-STUB] To: ${dto.to} | Subject: ${dto.subject}\n${dto.textBody ?? dto.htmlBody}`,
  );
  return {
    success: true,
    providerMessageId: `STUB-EMAIL-${Date.now()}`,
    providerResponse: JSON.stringify({ stub: true }),
  };
};

// ─── SMTP transport (Gmail or Ethereal) ──────────────────────────────────────

const sendViaSmtp = async (dto: SendEmailDto): Promise<EmailResult> => {
  const label = env.smtp.enabled ? "EMAIL-SMTP" : "EMAIL-ETHEREAL";
  try {
    const info = await smtpTransport!.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: dto.toName ? `"${dto.toName}" <${dto.to}>` : dto.to,
      subject: dto.subject,
      html: dto.htmlBody,
      text: dto.textBody ?? stripHtml(dto.htmlBody),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log(`[${label}] Sent! Preview URL: ${previewUrl}`);
    } else {
      console.log(`[${label}] Sent to ${dto.to} — messageId: ${info.messageId}`);
    }

    return {
      success: true,
      providerMessageId: info.messageId,
      providerResponse: JSON.stringify({ accepted: info.accepted }),
      previewUrl: previewUrl as string | undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${label}] Failed:`, message);
    return { success: false, errorMessage: message };
  }
};

// ─── SendGrid transport ───────────────────────────────────────────────────────

const sendViaSendGrid = async (
  dto: SendEmailDto,
  maxAttempts: number,
): Promise<EmailResult> => {
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
      const sgBody = (err as any)?.response?.body;
      if (sgBody) console.error("[EMAIL-SENDGRID] Error body:", JSON.stringify(sgBody));

      const isRetryable = isTransientError(err);
      if (!isRetryable || attempt === maxAttempts) break;

      const delay = env.retryDelayMs * attempt;
      console.warn(`[EMAIL-SENDGRID] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  return { success: false, errorMessage: lastError?.message ?? "Unknown email error" };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isTransientError = (err: unknown): boolean => {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: number }).code;
    return code === 429 || code >= 500;
  }
  return false;
};

const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
