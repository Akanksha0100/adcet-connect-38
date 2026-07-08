/**
 * Abstracted mailer with pluggable transport.
 *
 * Transport selection:
 *  - `NODE_ENV === "test"` → no-op
 *  - `SMTP_HOST` set → Nodemailer SMTP transport
 *  - otherwise → console-only (dev convenience)
 *
 * To switch providers later, implement a new `MailTransport` and register it
 * in `getTransport()` (e.g. Resend, SendGrid, SES). No call-site changes needed.
 */
import nodemailer from "nodemailer";
import type { SentMessageInfo } from "nodemailer";
import { logger } from "./logger.js";

// ── Public types ────────────────────────────────────────────────────────

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string; // URL or file path
  contentType?: string;
}

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

// ── Transport abstraction ───────────────────────────────────────────────

interface MailTransport {
  send(mail: OutgoingEmail): Promise<void>;
}

/** Console-only transport for dev / when no SMTP is configured. */
class ConsoleTransport implements MailTransport {
  async send(mail: OutgoingEmail): Promise<void> {
    const to = Array.isArray(mail.to) ? mail.to.join(", ") : mail.to;
    logger.info(
      { to, subject: mail.subject },
      `[mailer] (console-only) ${mail.subject} -> ${to}`,
    );
    console.log(
      `\n────────── EMAIL ──────────\n` +
      `To: ${to}\nSubject: ${mail.subject}\n${mail.text}\n` +
      (mail.attachments?.length
        ? `Attachments: ${mail.attachments.map((a) => a.filename).join(", ")}\n`
        : "") +
      `──────────────────────────\n`,
    );
  }
}

/** Real SMTP transport via Nodemailer. */
class SmtpTransport implements MailTransport {
  private transporter: nodemailer.Transporter<SentMessageInfo>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  async send(mail: OutgoingEmail): Promise<void> {
    const info = await this.transporter.sendMail({
      from: process.env.SMTP_FROM || `"ADCET Alumni Portal" <noreply@adcet.in>`,
      to: Array.isArray(mail.to) ? mail.to.join(", ") : mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content as Buffer | string | undefined,
        path: a.path,
        contentType: a.contentType,
      })),
    });
    logger.info(
      { messageId: info.messageId, to: mail.to },
      `[mailer] sent via SMTP: ${mail.subject}`,
    );
  }
}

/** No-op transport for tests. */
class NoopTransport implements MailTransport {
  async send(_mail: OutgoingEmail): Promise<void> {
    // intentionally empty
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

let transport: MailTransport | null = null;

const getTransport = (): MailTransport => {
  if (transport) return transport;

  if (process.env.NODE_ENV === "test") {
    transport = new NoopTransport();
  } else if (process.env.SMTP_HOST) {
    transport = new SmtpTransport();
    logger.info(`[mailer] using SMTP transport (${process.env.SMTP_HOST})`);
  } else {
    transport = new ConsoleTransport();
    logger.info("[mailer] no SMTP_HOST set — using console transport");
  }

  return transport;
};

// ── Public API ──────────────────────────────────────────────────────────

export const sendEmail = async (mail: OutgoingEmail): Promise<void> => {
  await getTransport().send(mail);
};

/**
 * Send email to multiple recipients individually (BCC-style, each gets
 * their own copy). Useful for event notifications where each email may
 * contain personalised RSVP links.
 */
export const sendBulkEmails = async (
  mails: OutgoingEmail[],
): Promise<{ sent: number; failed: number }> => {
  const t = getTransport();
  const results = await Promise.allSettled(mails.map((m) => t.send(m)));
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed) {
    logger.warn(
      { failedCount: failed, total: mails.length },
      `[mailer] ${failed}/${mails.length} bulk emails failed`,
    );
  }
  return { sent: mails.length - failed, failed };
};

/** Reset transport (useful for testing). */
export const _resetTransport = () => {
  transport = null;
};