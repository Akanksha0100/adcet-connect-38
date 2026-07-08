/**
 * Direct controller tests for the parts of auth.controller that are awkward
 * to exercise via supertest: forgot-password (always 202), reset-password,
 * change-password, and the OAuth error branches. The service layer is mocked
 * so we test only the controller's request/response wiring.
 */
import { describe, expect, it, jest } from "@jest/globals";

const forgotPassword = jest.fn(async () => undefined);
const resetPassword = jest.fn(async () => undefined);
const changePassword = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/auth/auth.service.js", () => ({
  forgotPassword,
  resetPassword,
  changePassword,
}));

const ctrl = await import("../../../modules/auth/auth.controller.js");

const mkRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

describe("auth.controller — password recovery", () => {
  it("forgotPassword returns 202 with a neutral message and calls the service", async () => {
    const res = mkRes();
    await ctrl.forgotPassword({ body: { email: "a@b.com" } } as any, res);
    expect(forgotPassword).toHaveBeenCalledWith("a@b.com");
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json.mock.calls[0][0]).toMatchObject({ message: expect.stringMatching(/reset link/i) });
  });

  it("resetPassword delegates to the service and responds", async () => {
    const res = mkRes();
    await ctrl.resetPassword({ body: { token: "tok", newPassword: "NewStrong#1" } } as any, res);
    expect(resetPassword).toHaveBeenCalledWith("tok", "NewStrong#1");
    expect(res.json).toHaveBeenCalled();
  });

  it("changePassword requires auth (401 when unauthenticated)", async () => {
    await expect(
      ctrl.changePassword({ body: { currentPassword: "x", newPassword: "y" } } as any, mkRes()),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("changePassword delegates to the service for an authenticated user", async () => {
    const res = mkRes();
    await ctrl.changePassword(
      { auth: { sub: "u-1" }, body: { currentPassword: "old", newPassword: "NewStrong#1" } } as any,
      res,
    );
    expect(changePassword).toHaveBeenCalledWith("u-1", "old", "NewStrong#1");
    expect(res.json).toHaveBeenCalled();
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