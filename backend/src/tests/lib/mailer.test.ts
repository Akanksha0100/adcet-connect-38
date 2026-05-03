import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * The mailer is intentionally a no-op when NODE_ENV === "test", but we want
 * to exercise both branches (console-only and SMTP-stub) explicitly so a
 * future refactor doesn't silently regress them.
 */
describe("lib/mailer", () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    delete process.env.SMTP_HOST;
    logSpy.mockRestore();
  });

  it("is a no-op in NODE_ENV=test", async () => {
    const { sendEmail } = await import("../../lib/mailer.js");
    await sendEmail({ to: "a@b.com", subject: "hi", text: "x" });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("logs to console in dev when SMTP_HOST is unset", async () => {
    process.env.NODE_ENV = "development";
    const { sendEmail } = await import("../../lib/mailer.js");
    await sendEmail({ to: "a@b.com", subject: "hello", text: "body" });
    expect(logSpy).toHaveBeenCalled();
    const printed = logSpy.mock.calls.flat().join("\n");
    expect(printed).toContain("a@b.com");
    expect(printed).toContain("hello");
  });

  it("falls back to SMTP-stub log when SMTP_HOST is set", async () => {
    process.env.NODE_ENV = "development";
    process.env.SMTP_HOST = "smtp.example.com";
    const { sendEmail } = await import("../../lib/mailer.js");
    await sendEmail({ to: "ops@x.com", subject: "ping", text: "pong" });
    const printed = logSpy.mock.calls.flat().join("\n");
    expect(printed).toContain("smtp-stub");
    expect(printed).toContain("ops@x.com");
  });
});