import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const sendEmail = jest.fn<(mail: unknown) => Promise<void>>();
jest.unstable_mockModule("../../../lib/mailer.js", () => ({ sendEmail }));

const { sendRegistrationOtp } = await import("../../../modules/auth/auth.service.js");

const originalFlag = process.env.EXPOSE_OTP_ON_MAIL_FAILURE;

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) => {
    if (m && typeof m === "object") {
      Object.values(m).forEach((fn: any) => fn?.mockReset?.());
    }
  });
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.$transaction.mockResolvedValue([]);
  delete process.env.EXPOSE_OTP_ON_MAIL_FAILURE;
});

afterEach(() => {
  if (originalFlag === undefined) delete process.env.EXPOSE_OTP_ON_MAIL_FAILURE;
  else process.env.EXPOSE_OTP_ON_MAIL_FAILURE = originalFlag;
});

describe("modules/auth/service — sendRegistrationOtp", () => {
  it("mails the code and returns nothing to expose on success", async () => {
    await expect(sendRegistrationOtp("new@example.com")).resolves.toEqual({});
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects an email that already has an account", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1" });
    await expect(sendRegistrationOtp("taken@example.com")).rejects.toMatchObject({ status: 409 });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("surfaces a delivery failure as 503 rather than a generic 500", async () => {
    sendEmail.mockRejectedValueOnce(Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }));
    await expect(sendRegistrationOtp("new@example.com")).rejects.toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("returns the code instead when EXPOSE_OTP_ON_MAIL_FAILURE is on", async () => {
    process.env.EXPOSE_OTP_ON_MAIL_FAILURE = "true";
    sendEmail.mockRejectedValueOnce(new Error("connect ETIMEDOUT"));
    const res = await sendRegistrationOtp("new@example.com");
    expect(res.devCode).toMatch(/^\d{6}$/);
  });

  it("never returns the code when delivery succeeds, flag on or not", async () => {
    process.env.EXPOSE_OTP_ON_MAIL_FAILURE = "true";
    await expect(sendRegistrationOtp("new@example.com")).resolves.toEqual({});
  });
});
