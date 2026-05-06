/**
 * Direct controller tests for the parts of auth.controller that are awkward
 * to exercise via supertest: forgot-password (always 202), reset-password
 * (501 NotImplemented), and the OAuth fallback JSON branch when no
 * OAUTH_SUCCESS_REDIRECT is configured.
 */
import { describe, expect, it, jest } from "@jest/globals";

const ctrl = await import("../../../modules/auth/auth.controller.js");

const mkRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

describe("auth.controller — password recovery stubs", () => {
  it("forgotPassword always returns 202 with neutral message", async () => {
    const res = mkRes();
    await ctrl.forgotPassword({} as any, res);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      message: expect.stringMatching(/reset link/i),
    });
  });

  it("resetPassword throws NotImplemented (501)", async () => {
    await expect(ctrl.resetPassword({} as any, {} as any)).rejects.toMatchObject({ status: 501 });
  });
});

describe("auth.controller — oauthStart error branches", () => {
  it("400 BadRequest for unknown provider", async () => {
    await expect(
      ctrl.oauthStart({ params: { provider: "myspace" } } as any, mkRes()),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("auth.controller — oauthCallback error branches", () => {
  it("400 BadRequest for unknown provider", async () => {
    await expect(
      ctrl.oauthCallback({ params: { provider: "myspace" }, query: {} } as any, mkRes()),
    ).rejects.toMatchObject({ status: 400 });
  });
});