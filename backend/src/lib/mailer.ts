/**
 * Stub mailer. In dev, emails are console-logged so devs can see them
 * without setting up SMTP. In prod, swap this for nodemailer/Resend etc
 * without changing call sites.
 *
 * To enable real SMTP later, set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS
 * in env and replace the body of `send()` with a transport.sendMail call.
 */
import { logger } from "./logger.js";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (mail: OutgoingEmail): Promise<void> => {
  // No-op in test runs.
  if (process.env.NODE_ENV === "test") return;

  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    // Dev/default — log only.
    logger.info(
      { to: mail.to, subject: mail.subject },
      `[mailer] (console-only) ${mail.subject} -> ${mail.to}`,
    );
    // eslint-disable-next-line no-console
    console.log(`\n────────── EMAIL ──────────\nTo: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n──────────────────────────\n`);
    return;
  }

  // SMTP wiring left as a TODO — install nodemailer when ready.
  logger.warn({ to: mail.to }, "SMTP_HOST set but nodemailer transport not wired; falling back to log");
  // eslint-disable-next-line no-console
  console.log(`[mailer:smtp-stub] to=${mail.to} subj=${mail.subject}`);
};