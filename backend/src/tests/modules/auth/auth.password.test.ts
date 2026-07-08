/**
 * Unit tests for the password reset / change flows. The password lib is mocked
 * so we can assert control-flow without paying bcrypt costs.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
jest.unstable_mockModule("../../../lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed-new"),
  verifyPassword: jest.fn(async (plain: string) => plain === "correct-current"),
}));

const { forgotPassword, resetPassword, changePassword } = await import(
  "../../../modules/auth/auth.service.js"
);

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("auth.service — forgotPassword", () => {
  it("does nothing for an unknown email (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await forgotPassword("nobody@x.com");
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("does nothing for an OAuth-only account (no password)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", email: "a@x.com", passwordHash: null });
    await forgotPassword("a@x.com");
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("mints a fresh token for a valid account", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", email: "a@x.com", firstName: "Al", passwordHash: "h" });
    prismaMock.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValueOnce({});
    await forgotPassword("a@x.com");
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalled(); // invalidate old
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();
    const data = (prismaMock.passwordResetToken.create.mock.calls[0][0] as any).data;
    expect(data.userId).toBe("u-1");
    expect(typeof data.tokenHash).toBe("string");
  });
});

describe("auth.service — resetPassword", () => {
  it("rejects an unknown token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(resetPassword("bad", "NewPass123")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an already-used token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce({ id: "t-1", userId: "u-1", usedAt: new Date(), expiresAt: new Date(Date.now() + 1000) });
    await expect(resetPassword("tok", "NewPass123")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an expired token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce({ id: "t-1", userId: "u-1", usedAt: null, expiresAt: new Date(Date.now() - 1000) });
    await expect(resetPassword("tok", "NewPass123")).rejects.toMatchObject({ status: 400 });
  });

  it("updates the password, consumes the token, and revokes sessions", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValueOnce({ id: "t-1", userId: "u-1", usedAt: null, expiresAt: new Date(Date.now() + 60_000) });
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.passwordResetToken.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 });
    await resetPassword("tok", "NewPass123");
    expect((prismaMock.user.update.mock.calls[0][0] as any).data.passwordHash).toBe("hashed-new");
    expect(prismaMock.passwordResetToken.update).toHaveBeenCalled();
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
  });
});

describe("auth.service — changePassword", () => {
  it("rejects when the account has no password (OAuth-only)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", passwordHash: null });
    await expect(changePassword("u-1", "x", "NewPass123")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an incorrect current password", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", passwordHash: "h" });
    await expect(changePassword("u-1", "wrong", "NewPass123")).rejects.toMatchObject({ status: 400 });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updates the password when the current one is correct", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", passwordHash: "h" });
    prismaMock.user.update.mockResolvedValueOnce({});
    await changePassword("u-1", "correct-current", "NewPass123");
    expect((prismaMock.user.update.mock.calls[0][0] as any).data.passwordHash).toBe("hashed-new");
  });
});
