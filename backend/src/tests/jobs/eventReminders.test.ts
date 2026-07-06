import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma: prismaMock }));
jest.unstable_mockModule("../../lib/mailer.js", () => ({
  sendBulkEmails: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule("../../lib/email-templates.js", () => ({
  eventReminderEmail: jest.fn().mockReturnValue({ subject: "s", text: "t", html: "h" }),
  eventNonResponderReminderEmail: jest.fn().mockReturnValue({ subject: "s", text: "t", html: "h" }),
  eventRsvpSummaryEmail: jest.fn().mockReturnValue({ subject: "s", text: "t", html: "h" }),
}));

const { runEventReminders } = await import("../../jobs/eventReminders.js");
const { sendBulkEmails } = await import("../../lib/mailer.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object"
      ? Object.values(m).forEach((fn: any) => fn?.mockReset?.())
      : null,
  );
  (sendBulkEmails as jest.Mock).mockReset();
  (sendBulkEmails as jest.Mock).mockResolvedValue(undefined);
});

describe("runEventReminders", () => {
  it("returns zeroes when no events tomorrow", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    const result = await runEventReminders();
    expect(result).toEqual({ eventsProcessed: 0, remindersSent: 0, nonResponderRemindersSent: 0 });
    expect(sendBulkEmails).not.toHaveBeenCalled();
  });

  it("sends reminders to GOING users for tomorrow's events", async () => {
    const tomorrow = new Date(Date.now() + 30 * 60 * 60 * 1000);
    prismaMock.event.findMany.mockResolvedValueOnce([
      {
        id: "e-1",
        title: "Test Event",
        startsAt: tomorrow,
        endsAt: null,
        location: "Room A",
        isOnline: false,
        department: null,
        status: "APPROVED",
        rsvps: [
          {
            userId: "u-1",
            status: "GOING",
            user: { id: "u-1", email: "a@test.com", firstName: "A", lastName: "B", preferences: null },
          },
        ],
      },
    ]);

    // Mock non-responders query
    prismaMock.user.findMany
      .mockResolvedValueOnce([]) // non-responders
      .mockResolvedValueOnce([]); // summary recipients

    const result = await runEventReminders();
    expect(result.eventsProcessed).toBe(1);
    expect(result.remindersSent).toBe(1);
    expect(sendBulkEmails).toHaveBeenCalled();
  });

  it("sends non-responder reminders to alumni who haven't RSVP'd", async () => {
    const tomorrow = new Date(Date.now() + 30 * 60 * 60 * 1000);
    prismaMock.event.findMany.mockResolvedValueOnce([
      {
        id: "e-2",
        title: "Event 2",
        startsAt: tomorrow,
        endsAt: null,
        location: null,
        isOnline: true,
        department: "CSE",
        status: "APPROVED",
        rsvps: [],
      },
    ]);

    // Non-responders
    prismaMock.user.findMany
      .mockResolvedValueOnce([
        { id: "u-2", email: "b@test.com", firstName: "B", lastName: "C", preferences: null },
      ])
      // Summary recipients
      .mockResolvedValueOnce([
        { email: "b@test.com", firstName: "B", lastName: "C", preferences: null },
      ]);

    const result = await runEventReminders();
    expect(result.eventsProcessed).toBe(1);
    expect(result.nonResponderRemindersSent).toBe(1);
  });

  it("respects email notification opt-out", async () => {
    const tomorrow = new Date(Date.now() + 30 * 60 * 60 * 1000);
    prismaMock.event.findMany.mockResolvedValueOnce([
      {
        id: "e-3",
        title: "Event 3",
        startsAt: tomorrow,
        endsAt: null,
        location: null,
        isOnline: false,
        department: null,
        status: "APPROVED",
        rsvps: [
          {
            userId: "u-3",
            status: "GOING",
            user: { id: "u-3", email: "c@test.com", firstName: "C", lastName: "D", preferences: { notificationsEmail: false } },
          },
        ],
      },
    ]);

    prismaMock.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await runEventReminders();
    expect(result.remindersSent).toBe(0);
  });
});
