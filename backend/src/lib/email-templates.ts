/**
 * Branded HTML email templates for the ADCET Alumni Portal.
 * All templates share a consistent header/footer wrapper with portal branding.
 */

const PORTAL_URL = process.env.CORS_ORIGIN || "http://localhost:8080";

/** Escape HTML special characters to prevent XSS in email templates. */
const esc = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// ── Shared wrapper ──────────────────────────────────────────────────────

const wrap = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1e3a5f, #2a4a72, #2d8a6e); padding: 28px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); font-size: 13px; margin: 6px 0 0; }
    .body { padding: 32px; }
    .footer { background: #f8f9fa; padding: 20px 32px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { color: #6c757d; font-size: 11px; margin: 4px 0; }
    .btn { display: inline-block; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 4px; }
    .btn-primary { background: #1e3a5f; color: #ffffff !important; }
    .btn-success { background: #2d8a6e; color: #ffffff !important; }
    .btn-warning { background: #e67e22; color: #ffffff !important; }
    .btn-secondary { background: #6c757d; color: #ffffff !important; }
    .btn-danger { background: #c0392b; color: #ffffff !important; }
    .info-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .info-label { color: #6c757d; font-size: 13px; min-width: 120px; font-weight: 500; }
    .info-value { color: #2c3e50; font-size: 14px; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-dept { background: #e8f5e9; color: #2d8a6e; }
    .badge-online { background: #e3f2fd; color: #1565c0; }
    h2 { color: #1e3a5f; font-size: 18px; margin: 0 0 16px; }
    p { color: #4a5568; font-size: 14px; line-height: 1.6; }
    .rsvp-section { text-align: center; margin: 28px 0 12px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .rsvp-section p { font-size: 15px; font-weight: 600; color: #2c3e50; margin-bottom: 16px; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; border-radius: 0; }
      .body { padding: 20px; }
      .header { padding: 20px; }
      .btn { display: block; margin: 8px 0; text-align: center; }
    }
  </style>
</head>
<body>
  <div style="padding: 20px;">
    <div class="container">
      <div class="header">
        <h1>ADCET Alumni Portal</h1>
        <p>Annasaheb Dange College of Engineering & Technology</p>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ADCET, Ashta. All rights reserved.</p>
        <p>This email was sent from the ADCET Alumni Portal.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ── Event notification email ────────────────────────────────────────────

export interface EventEmailData {
  title: string;
  description: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  isOnline?: boolean;
  department?: string | null;
  eventId: string;
  attachmentKey?: string | null;
}

export interface RsvpLink {
  label: string;
  url: string;
  style: string; // CSS class suffix: primary, success, warning, danger
}

export const eventNotificationEmail = (
  event: EventEmailData,
  recipientName: string,
  rsvpLinks: RsvpLink[],
): { subject: string; text: string; html: string } => {
  const eventUrl = `${PORTAL_URL}/dashboard/events/${event.eventId}`;
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(event.startsAt);

  const rsvpButtonsHtml = rsvpLinks
    .map((l) => `<a href="${l.url}" class="btn btn-${l.style}">${l.label}</a>`)
    .join("\n              ");

  const body = `
    <h2>📅 New Event: ${esc(event.title)}</h2>
    <p>Hi ${esc(recipientName)},</p>
    <p>A new event has been created on the ADCET Alumni Portal that may interest you!</p>

    <div style="margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px; width: 120px;">Event</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(event.title)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Date & Time</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px; font-weight: 600;">${dateStr}</td>
        </tr>
        ${event.location ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Location</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(event.location)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Mode</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">
            <span class="badge ${event.isOnline ? "badge-online" : "badge-dept"}">${event.isOnline ? "Online" : "Offline"}</span>
          </td>
        </tr>
        ${event.department ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Department</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">
            <span class="badge badge-dept">${esc(event.department)}</span>
          </td>
        </tr>` : ""}
      </table>
    </div>

    <p>${esc(event.description.slice(0, 300))}${event.description.length > 300 ? "..." : ""}</p>

    ${event.attachmentKey ? `<p>📎 <strong>An attachment is included with this event.</strong> View or download it from the event page on the portal.</p>` : ""}

    <div class="rsvp-section">
      <p>Would you like to attend this event?</p>
      ${rsvpButtonsHtml}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${eventUrl}" class="btn btn-primary">View Event on Portal →</a>
    </div>
  `;

  const text =
    `New Event: ${event.title}\n\n` +
    `Hi ${recipientName},\n\n` +
    `A new event has been created on the ADCET Alumni Portal.\n\n` +
    `Event: ${event.title}\n` +
    `Date: ${dateStr}\n` +
    `${event.location ? `Location: ${event.location}\n` : ""}` +
    `Mode: ${event.isOnline ? "Online" : "Offline"}\n` +
    `${event.department ? `Department: ${event.department}\n` : ""}` +
    `\n${event.description.slice(0, 500)}\n\n` +
    `View event: ${eventUrl}\n`;

  return {
    subject: `📅 New Event: ${event.title} — ADCET Alumni`,
    text,
    html: wrap(`New Event: ${event.title}`, body),
  };
};

// ── Job application notification email ──────────────────────────────────

export interface JobApplicationEmailData {
  jobTitle: string;
  company: string;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  applicantDepartment?: string | null;
  applicantGradYear?: number | null;
  applicantCompany?: string | null;
  applicantRole?: string | null;
  applicantLinkedin?: string | null;
  coverLetter?: string | null;
}

export const jobApplicationEmail = (
  data: JobApplicationEmailData,
): { subject: string; text: string; html: string } => {
  const jobUrl = `${PORTAL_URL}/dashboard/jobs/${data.jobId}`;

  const body = `
    <h2>💼 New Application for "${esc(data.jobTitle)}"</h2>
    <p>You have received a new application for your job posting at <strong>${esc(data.company)}</strong>.</p>

    <div style="margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px; width: 130px;">Applicant</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(data.applicantName)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">
            <a href="mailto:${esc(data.applicantEmail)}" style="color: #1e3a5f;">${esc(data.applicantEmail)}</a>
          </td>
        </tr>
        ${data.applicantDepartment ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Department</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">${esc(data.applicantDepartment)}</td>
        </tr>` : ""}
        ${data.applicantGradYear ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Graduation Year</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">${data.applicantGradYear}</td>
        </tr>` : ""}
        ${data.applicantCompany ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Current Company</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">${esc(data.applicantCompany)}${data.applicantRole ? ` — ${esc(data.applicantRole)}` : ""}</td>
        </tr>` : ""}
        ${data.applicantLinkedin ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">LinkedIn</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">
            <a href="${esc(data.applicantLinkedin)}" style="color: #1e3a5f;">Profile →</a>
          </td>
        </tr>` : ""}
      </table>
    </div>

    ${data.coverLetter ? `
    <div style="margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #1e3a5f;">
      <p style="font-weight: 600; color: #1e3a5f; margin-bottom: 8px;">Cover Letter:</p>
      <p style="white-space: pre-wrap;">${esc(data.coverLetter)}</p>
    </div>` : ""}

    <p>📎 If the applicant uploaded a resume, it is attached to this email.</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${jobUrl}" class="btn btn-primary">View Job & All Applications →</a>
    </div>
  `;

  const text =
    `New Application for "${data.jobTitle}" at ${data.company}\n\n` +
    `Applicant: ${data.applicantName} (${data.applicantEmail})\n` +
    `${data.applicantDepartment ? `Department: ${data.applicantDepartment}\n` : ""}` +
    `${data.applicantGradYear ? `Graduation: ${data.applicantGradYear}\n` : ""}` +
    `${data.applicantCompany ? `Current: ${data.applicantCompany}\n` : ""}` +
    `\nView job: ${jobUrl}\n`;

  return {
    subject: `💼 New Application: ${data.applicantName} — ${data.jobTitle}`,
    text,
    html: wrap(`New Application for ${data.jobTitle}`, body),
  };
};

// ── Event reminder email (for interested/going users, 1 day before) ────────

export const eventReminderEmail = (
  event: { id: string; title: string; startsAt: Date; endsAt: Date | null; location: string | null; isOnline: boolean },
  recipientName: string,
): { subject: string; text: string; html: string } => {
  const eventUrl = `${PORTAL_URL}/dashboard/events/${event.id}`;
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(event.startsAt);

  const body = `
    <h2>⏰ Reminder: ${esc(event.title)} is Tomorrow!</h2>
    <p>Hi ${esc(recipientName)},</p>
    <p>This is a friendly reminder that <strong>${esc(event.title)}</strong> is happening <strong>tomorrow</strong>!</p>

    <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #2d8a6e;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; font-size: 13px; width: 100px;">Date</td>
          <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">${dateStr}</td>
        </tr>
        ${event.location ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d; font-size: 13px;">Location</td>
          <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(event.location)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6c757d; font-size: 13px;">Mode</td>
          <td style="padding: 8px 0; color: #2c3e50; font-size: 14px;">
            <span class="badge ${event.isOnline ? "badge-online" : "badge-dept"}">${event.isOnline ? "Online" : "In Person"}</span>
          </td>
        </tr>
      </table>
    </div>

    <p>We look forward to seeing you there!</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${eventUrl}" class="btn btn-primary">View Event Details →</a>
    </div>
  `;

  return {
    subject: `⏰ Reminder: ${event.title} is Tomorrow! — ADCET Alumni`,
    text: `Reminder: ${event.title} is tomorrow!\n\nDate: ${dateStr}\n${event.location ? `Location: ${event.location}\n` : ""}\nView: ${eventUrl}`,
    html: wrap(`Reminder: ${event.title}`, body),
  };
};

// ── Event non-responder reminder (1 day before) ────────────────────────

export const eventNonResponderReminderEmail = (
  event: { id: string; title: string; startsAt: Date; endsAt: Date | null; location: string | null; isOnline: boolean },
  recipientName: string,
): { subject: string; text: string; html: string } => {
  const eventUrl = `${PORTAL_URL}/dashboard/events/${event.id}`;
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(event.startsAt);

  const body = `
    <h2>📅 Don't Miss: ${esc(event.title)} is Tomorrow!</h2>
    <p>Hi ${esc(recipientName)},</p>
    <p>We noticed you haven't responded to <strong>${esc(event.title)}</strong> yet. The event is happening <strong>tomorrow</strong> — we'd love to know if you can make it!</p>

    <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #e67e22;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; font-size: 13px; width: 100px;">Date</td>
          <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">${dateStr}</td>
        </tr>
        ${event.location ? `
        <tr>
          <td style="padding: 8px 0; color: #6c757d; font-size: 13px;">Location</td>
          <td style="padding: 8px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(event.location)}</td>
        </tr>` : ""}
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${eventUrl}" class="btn btn-success">RSVP Now →</a>
    </div>
  `;

  return {
    subject: `📅 Last Chance to RSVP: ${event.title} — ADCET Alumni`,
    text: `Don't miss ${event.title} tomorrow!\n\nDate: ${dateStr}\n\nRSVP: ${eventUrl}`,
    html: wrap(`Don't Miss: ${event.title}`, body),
  };
};

// ── Event RSVP summary email (sent to all, 1 day before) ───────────────

export const eventRsvpSummaryEmail = (
  event: { id: string; title: string; startsAt: Date },
  recipientName: string,
  counts: { going: number; interested: number; notGoing: number },
): { subject: string; text: string; html: string } => {
  const eventUrl = `${PORTAL_URL}/dashboard/events/${event.id}`;
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(event.startsAt);

  const body = `
    <h2>📊 RSVP Update: ${esc(event.title)}</h2>
    <p>Hi ${esc(recipientName)},</p>
    <p>Here's the latest RSVP status for <strong>${esc(event.title)}</strong> happening tomorrow (${dateStr}):</p>

    <div style="margin: 20px 0; text-align: center;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 16px; text-align: center; background: #e8f5e9; border-radius: 8px 0 0 8px;">
            <div style="font-size: 24px; font-weight: 700; color: #2d8a6e;">${counts.going}</div>
            <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Going</div>
          </td>
          <td style="padding: 16px; text-align: center; background: #fff3e0;">
            <div style="font-size: 24px; font-weight: 700; color: #e67e22;">${counts.interested}</div>
            <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Interested</div>
          </td>
          <td style="padding: 16px; text-align: center; background: #fce4ec; border-radius: 0 8px 8px 0;">
            <div style="font-size: 24px; font-weight: 700; color: #c0392b;">${counts.notGoing}</div>
            <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Not Going</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${eventUrl}" class="btn btn-primary">View Full Event Details →</a>
    </div>
  `;

  return {
    subject: `📊 RSVP Update: ${event.title} — ADCET Alumni`,
    text: `RSVP Update for ${event.title}\n\nGoing: ${counts.going}\nInterested: ${counts.interested}\nNot Going: ${counts.notGoing}\n\nView: ${eventUrl}`,
    html: wrap(`RSVP Update: ${event.title}`, body),
  };
};

// ── Job notification email (sent to dept alumni when job is approved) ────

export interface JobNotificationEmailData {
  title: string;
  company: string;
  jobId: string;
  location?: string | null;
  isRemote: boolean;
  employmentType: string;
  department?: string | null;
  description: string;
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
}

export const jobNotificationEmail = (
  job: JobNotificationEmailData,
  recipientName: string,
): { subject: string; text: string; html: string } => {
  const jobUrl = `${PORTAL_URL}/dashboard/jobs/${job.jobId}`;

  const empTypeLabels: Record<string, string> = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    INTERNSHIP: "Internship",
    CONTRACT: "Contract",
  };

  const salaryRange = job.salaryMin || job.salaryMax
    ? `${job.currency} ${job.salaryMin ? job.salaryMin.toLocaleString() : "—"} – ${job.salaryMax ? job.salaryMax.toLocaleString() : "—"}`
    : null;

  const body = `
    <h2>💼 New Job Opportunity: ${esc(job.title)}</h2>
    <p>Hi ${esc(recipientName)},</p>
    <p>A new job has been posted on the ADCET Alumni Portal that might interest you!</p>

    <div style="margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px; width: 120px;">Position</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(job.title)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Company</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px; font-weight: 600;">${esc(job.company)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Type</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">
            <span class="badge badge-dept">${empTypeLabels[job.employmentType] || job.employmentType}</span>
            ${job.isRemote ? '<span class="badge badge-online" style="margin-left: 6px;">Remote</span>' : ""}
          </td>
        </tr>
        ${job.location ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Location</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">${esc(job.location)}</td>
        </tr>` : ""}
        ${salaryRange ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Salary</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">${esc(salaryRange)}</td>
        </tr>` : ""}
        ${job.department ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6c757d; font-size: 13px;">Department</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #2c3e50; font-size: 14px;">
            <span class="badge badge-dept">${esc(job.department)}</span>
          </td>
        </tr>` : ""}
      </table>
    </div>

    <p>${esc(job.description.slice(0, 300))}${job.description.length > 300 ? "..." : ""}</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${jobUrl}" class="btn btn-primary">View Job & Apply →</a>
    </div>
  `;

  const text =
    `New Job: ${job.title} at ${job.company}\n\n` +
    `Hi ${recipientName},\n\n` +
    `Type: ${empTypeLabels[job.employmentType] || job.employmentType}\n` +
    `${job.location ? `Location: ${job.location}\n` : ""}` +
    `${job.isRemote ? "Remote: Yes\n" : ""}` +
    `\n${job.description.slice(0, 500)}\n\n` +
    `View & Apply: ${jobUrl}\n`;

  return {
    subject: `💼 New Job: ${job.title} at ${job.company} — ADCET Alumni`,
    text,
    html: wrap(`New Job: ${job.title}`, body),
  };
};

// ── Simple RSVP confirmation page (returned by the email-rsvp endpoint) ─

export const rsvpConfirmationHtml = (
  eventTitle: string,
  response: string,
): string => wrap(
  "RSVP Confirmed",
  `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <h2>Thank You!</h2>
      <p>Your RSVP for <strong>"${esc(eventTitle)}"</strong> has been recorded.</p>
      <p>Your response: <span class="badge badge-dept" style="font-size: 14px; padding: 6px 16px;">${esc(response)}</span></p>
      <div style="margin-top: 24px;">
        <a href="${PORTAL_URL}/dashboard/events" class="btn btn-primary">Go to Alumni Portal →</a>
      </div>
    </div>
  `,
);
