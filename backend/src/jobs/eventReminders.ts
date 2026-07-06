/**
 * Event reminder job. Runs daily and:
 * 1) Sends reminder emails to users who RSVP'd (GOING/INTERESTED) for events happening tomorrow
 * 2) Sends follow-up emails to alumni who haven't responded yet for events happening tomorrow
 * 3) Sends an updated RSVP summary email to all targeted alumni for events happening tomorrow
 */
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { sendBulkEmails } from "../lib/mailer.js";
import { eventReminderEmail, eventNonResponderReminderEmail, eventRsvpSummaryEmail } from "../lib/email-templates.js";

export interface EventReminderResult {
  eventsProcessed: number;
  remindersSent: number;
  nonResponderRemindersSent: number;
}

/**
 * Find events starting tomorrow (within the next 24-48 hours) and send reminders.
 */
export const runEventReminders = async (): Promise<EventReminderResult> => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find APPROVED events starting tomorrow
  const events = await prisma.event.findMany({
    where: {
      status: "APPROVED",
      startsAt: { gte: tomorrow, lt: dayAfter },
    },
    include: {
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              preferences: { select: { notificationsEmail: true } },
            },
          },
        },
      },
    },
  });

  if (events.length === 0) {
    logger.info("No events tomorrow — skipping reminders");
    return { eventsProcessed: 0, remindersSent: 0, nonResponderRemindersSent: 0 };
  }

  let totalReminders = 0;
  let totalNonResponder = 0;

  for (const event of events) {
    // 1. Send reminders to interested/going users
    const interestedUsers = event.rsvps
      .filter((r) => r.status === "GOING" || r.status === "INTERESTED")
      .map((r) => r.user)
      .filter((u) => !u.preferences || u.preferences.notificationsEmail);

    if (interestedUsers.length > 0) {
      const reminderEmails = interestedUsers.map((user) => ({
        to: user.email,
        ...eventReminderEmail(event, `${user.firstName} ${user.lastName}`.trim()),
      }));
      await sendBulkEmails(reminderEmails);
      totalReminders += reminderEmails.length;
    }

    // 2. Send reminder to non-responders (alumni who haven't RSVP'd at all)
    const respondedUserIds = new Set(event.rsvps.map((r) => r.userId));

    // Find alumni who should have been notified but haven't responded
    const whereClause: any = {
      status: "APPROVED",
      roles: { some: { role: "ALUMNI" } },
      id: { notIn: Array.from(respondedUserIds) },
    };
    if (event.department && event.department !== "All") {
      whereClause.profile = { department: event.department };
    }

    const nonResponders = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferences: { select: { notificationsEmail: true } },
      },
    });

    const filteredNonResponders = nonResponders.filter(
      (u) => !u.preferences || u.preferences.notificationsEmail,
    );

    if (filteredNonResponders.length > 0) {
      const nonResponderEmails = filteredNonResponders.map((user) => ({
        to: user.email,
        ...eventNonResponderReminderEmail(event, `${user.firstName} ${user.lastName}`.trim()),
      }));
      await sendBulkEmails(nonResponderEmails);
      totalNonResponder += nonResponderEmails.length;
    }

    // 3. Send RSVP summary to all targeted alumni
    const goingCount = event.rsvps.filter((r) => r.status === "GOING").length;
    const interestedCount = event.rsvps.filter((r) => r.status === "INTERESTED").length;
    const notGoingCount = event.rsvps.filter((r) => r.status === "NOT_GOING").length;

    // Collect all targeted alumni (both responders and non-responders) for the summary
    const allTargetedAlumni = await prisma.user.findMany({
      where: {
        status: "APPROVED",
        roles: { some: { role: "ALUMNI" } },
        ...(event.department && event.department !== "All"
          ? { profile: { department: event.department } }
          : {}),
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        preferences: { select: { notificationsEmail: true } },
      },
    });

    const summaryRecipients = allTargetedAlumni.filter(
      (u) => !u.preferences || u.preferences.notificationsEmail,
    );

    if (summaryRecipients.length > 0) {
      const summaryEmails = summaryRecipients.map((user) => ({
        to: user.email,
        ...eventRsvpSummaryEmail(event, `${user.firstName} ${user.lastName}`.trim(), {
          going: goingCount,
          interested: interestedCount,
          notGoing: notGoingCount,
        }),
      }));
      await sendBulkEmails(summaryEmails);
    }
  }

  logger.info(
    { eventsProcessed: events.length, remindersSent: totalReminders, nonResponderRemindersSent: totalNonResponder },
    "Event reminders sent",
  );

  return {
    eventsProcessed: events.length,
    remindersSent: totalReminders,
    nonResponderRemindersSent: totalNonResponder,
  };
};

/** Wire a daily interval. Returns a stop handle for graceful shutdown. */
export const startEventReminderCron = (intervalMs = 24 * 60 * 60 * 1000) => {
  // Run once at startup, then daily
  runEventReminders().catch((err) =>
    logger.error({ err }, "event reminder job crashed on initial run"),
  );

  const handle = setInterval(() => {
    runEventReminders().catch((err) =>
      logger.error({ err }, "event reminder job crashed"),
    );
  }, intervalMs);
  handle.unref?.();
  return () => clearInterval(handle);
};
