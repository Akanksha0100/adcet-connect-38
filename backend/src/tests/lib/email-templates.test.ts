import { describe, expect, it } from "@jest/globals";

const {
  eventNotificationEmail,
  eventReminderEmail,
  eventNonResponderReminderEmail,
  eventRsvpSummaryEmail,
  jobApplicationEmail,
  jobNotificationEmail,
  rsvpConfirmationHtml,
} = await import("../../lib/email-templates.js");

describe("email-templates", () => {
  describe("eventNotificationEmail", () => {
    it("produces subject, text, and html", () => {
      const result = eventNotificationEmail(
        {
          title: "Test Event",
          description: "A test",
          startsAt: new Date("2026-08-01T10:00:00Z"),
          endsAt: null,
          location: "Room A",
          isOnline: false,
          department: "CSE",
          eventId: "e-1",
          attachmentKey: null,
        },
        "John Doe",
        [{ label: "Yes", url: "http://example.com", style: "success" }],
      );
      expect(result.subject).toContain("Test Event");
      expect(result.text).toContain("Test Event");
      expect(result.html).toContain("Test Event");
      expect(result.html).toContain("John Doe");
      expect(result.html).toContain("CSE");
    });

    it("includes attachment notice when attachmentKey is present", () => {
      const result = eventNotificationEmail(
        {
          title: "With Attachment",
          description: "Has file",
          startsAt: new Date(),
          endsAt: null,
          location: null,
          isOnline: true,
          department: null,
          eventId: "e-2",
          attachmentKey: "event-attachment/u/file.pdf",
        },
        "Jane",
        [],
      );
      expect(result.html).toContain("attachment");
    });
  });

  describe("eventReminderEmail", () => {
    it("produces reminder email with event details", () => {
      const result = eventReminderEmail(
        { id: "e-1", title: "Reunion", startsAt: new Date(), endsAt: null, location: "Hall B", isOnline: false },
        "Alice",
      );
      expect(result.subject).toContain("Reminder");
      expect(result.subject).toContain("Reunion");
      expect(result.html).toContain("Alice");
      expect(result.html).toContain("Hall B");
    });
  });

  describe("eventNonResponderReminderEmail", () => {
    it("produces non-responder reminder with RSVP CTA", () => {
      const result = eventNonResponderReminderEmail(
        { id: "e-1", title: "Workshop", startsAt: new Date(), endsAt: null, location: null, isOnline: true },
        "Bob",
      );
      expect(result.subject).toContain("Last Chance");
      expect(result.html).toContain("Bob");
      expect(result.html).toContain("RSVP Now");
    });
  });

  describe("eventRsvpSummaryEmail", () => {
    it("includes RSVP counts", () => {
      const result = eventRsvpSummaryEmail(
        { id: "e-1", title: "Summit", startsAt: new Date() },
        "Charlie",
        { going: 10, interested: 5, notGoing: 2 },
      );
      expect(result.subject).toContain("RSVP Update");
      expect(result.html).toContain("10");
      expect(result.html).toContain("5");
      expect(result.html).toContain("2");
    });
  });

  describe("jobNotificationEmail", () => {
    it("produces job notification with company and title", () => {
      const result = jobNotificationEmail(
        {
          title: "SDE Intern",
          company: "Acme Corp",
          jobId: "j-1",
          location: "Pune",
          isRemote: false,
          employmentType: "INTERNSHIP",
          department: "CSE",
          description: "Great opportunity for interns",
          experienceMin: 0,
          experienceMax: 1,
          salaryMin: 10000,
          salaryMax: 20000,
          currency: "INR",
        },
        "Dev",
      );
      expect(result.subject).toContain("SDE Intern");
      expect(result.subject).toContain("Acme Corp");
      expect(result.html).toContain("Internship");
      expect(result.html).toContain("Pune");
      expect(result.html).toContain("CSE");
      expect(result.html).toContain("Dev");
    });

    it("handles remote jobs without location", () => {
      const result = jobNotificationEmail(
        {
          title: "Remote Dev",
          company: "Remote Inc",
          jobId: "j-2",
          location: null,
          isRemote: true,
          employmentType: "FULL_TIME",
          department: null,
          description: "Work from anywhere",
          experienceMin: null,
          experienceMax: null,
          salaryMin: null,
          salaryMax: null,
          currency: "INR",
        },
        "Alice",
      );
      expect(result.html).toContain("Remote");
      expect(result.text).toContain("Remote: Yes");
    });
  });

  describe("jobApplicationEmail", () => {
    it("includes applicant info", () => {
      const result = jobApplicationEmail({
        jobTitle: "SDE",
        company: "TCS",
        jobId: "j-1",
        applicantName: "John Doe",
        applicantEmail: "john@test.com",
        applicantDepartment: "CSE",
        applicantGradYear: 2024,
        applicantCompany: "Startup",
        applicantRole: "Intern",
        applicantLinkedin: "https://linkedin.com/in/john",
        coverLetter: "I want this job",
      });
      expect(result.subject).toContain("John Doe");
      expect(result.html).toContain("john@test.com");
      expect(result.html).toContain("Cover Letter");
    });
  });

  describe("rsvpConfirmationHtml", () => {
    it("returns HTML with event title and response", () => {
      const html = rsvpConfirmationHtml("My Event", "Yes, I will attend!");
      expect(html).toContain("My Event");
      expect(html).toContain("Yes, I will attend!");
      expect(html).toContain("Thank You");
    });
  });
});
