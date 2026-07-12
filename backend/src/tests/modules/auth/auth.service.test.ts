import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { register, login, refresh, logout, me, loginWithOAuth } = await import(
  "../../../modules/auth/auth.service.js"
);

const mkUser = (overrides: any = {}) => ({
  id: "u-1",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "A",
  passwordHash: "$2a$12$abcdefghijklmnopqrstuvCfQ8VfV6vQ6QvJjqg7wKqYmCQgvJjA0u", // placeholder
  status: "PENDING",
  rejectionReason: null,
  roles: [{ role: "ALUMNI" }],
  ...overrides,
});

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) => {
    if (m && typeof m === "object") {
      Object.values(m).forEach((fn: any) => fn?.mockReset?.());
    }
  });
});

describe("modules/auth/service — register", () => {
  it("creates a PENDING, email-verified user, attaches role+profile, and issues tokens", async () => {
    const { hashToken } = await import("../../../lib/jwt.js");
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.emailVerificationOtp.findFirst.mockResolvedValueOnce({
      id: "otp-1",
      email: "alice@example.com",
      codeHash: hashToken("123456"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      attempts: 0,
    });
    prismaMock.emailVerificationOtp.update.mockResolvedValueOnce({});
    prismaMock.user.create.mockResolvedValueOnce(mkUser());
    prismaMock.refreshToken.create.mockResolvedValueOnce({});

    const result = await register({
      email: "alice@example.com",
      password: "Strong#Pass1",
      otp: "123456",
      firstName: "Alice",
      lastName: "A",
    } as any);

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.user.create.mock.calls[0][0] as any;
    expect(createArg.data.status).toBe("PENDING");
    expect(createArg.data.emailVerifiedAt).toBeInstanceOf(Date);
    expect(createArg.data.roles.create.role).toBe("ALUMNI");
    expect(createArg.data.passwordHash).not.toBe("Strong#Pass1");
    // The OTP is single-use: it must be consumed on success.
    expect(prismaMock.emailVerificationOtp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
    );

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toMatchObject({ email: "alice@example.com", roles: ["ALUMNI"] });
  });

  it("rejects registration without a valid OTP", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.emailVerificationOtp.findFirst.mockResolvedValueOnce(null);
    await expect(
      register({
        email: "alice@example.com",
        password: "Strong#Pass1",
        otp: "123456",
        firstName: "A",
        lastName: "B",
      } as any),
    ).rejects.toMatchObject({ status: 400 });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate email with 409 Conflict", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "x", email: "alice@example.com" });
    await expect(
      register({ email: "alice@example.com", password: "x", firstName: "A", lastName: "B" } as any),
    ).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("modules/auth/service — login", () => {
  it("rejects unknown email with 401", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(login({ email: "x@y.z", password: "p" } as any)).rejects.toMatchObject({ status: 401 });
  });

  it("rejects accounts with no passwordHash (OAuth-only) with 401", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(mkUser({ passwordHash: null }));
    await expect(login({ email: "alice@example.com", password: "x" } as any)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects wrong password with 401", async () => {
    const { hashPassword } = await import("../../../lib/password.js");
    const hash = await hashPassword("rightpw");
    prismaMock.user.findUnique.mockResolvedValueOnce(mkUser({ passwordHash: hash }));
    await expect(
      login({ email: "alice@example.com", password: "wrongpw" } as any),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("issues tokens, stamps lastLoginAt, returns roles", async () => {
    const { hashPassword } = await import("../../../lib/password.js");
    const hash = await hashPassword("rightpw");
    prismaMock.user.findUnique.mockResolvedValueOnce(
      mkUser({ passwordHash: hash, roles: [{ role: "ALUMNI" }, { role: "ADMIN" }] }),
    );
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.create.mockResolvedValueOnce({});

    const out = await login({ email: "alice@example.com", password: "rightpw" } as any);
    expect(out.accessToken).toBeTruthy();
    expect(out.user.roles).toEqual(["ALUMNI", "ADMIN"]);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastLoginAt: expect.any(Date) }) }),
    );
  });
}, 30_000);

describe("modules/auth/service — refresh / logout", () => {
  it("refresh: invalid JWT signature → 401", async () => {
    await expect(refresh("not.a.token")).rejects.toMatchObject({ status: 401 });
  });

  it("refresh: token row missing or revoked → 401", async () => {
    const { signRefreshToken } = await import("../../../lib/jwt.js");
    const tok = signRefreshToken("u-1");
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(refresh(tok)).rejects.toMatchObject({ status: 401 });

    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: "r-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(refresh(tok)).rejects.toMatchObject({ status: 401 });
  });

  it("refresh: rotates token (revokes old, issues new pair)", async () => {
    const { signRefreshToken } = await import("../../../lib/jwt.js");
    const tok = signRefreshToken("u-1");
    prismaMock.refreshToken.findUnique.mockResolvedValueOnce({
      id: "r-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockResolvedValueOnce(mkUser());
    prismaMock.refreshToken.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.create.mockResolvedValueOnce({});

    const out = await refresh(tok);
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r-1" } }),
    );
    expect(out.accessToken).toBeTruthy();
    expect(out.refreshToken).toBeTruthy();
    expect(out.refreshToken).not.toBe(tok);
  });

  it("logout marks the matching refresh row revoked", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
    await logout("any-token");
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("modules/auth/service — me / OAuth", () => {
  it("me: 401 when user vanished", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(me("u-1")).rejects.toMatchObject({ status: 401 });
  });

  it("me: returns the public projection", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(mkUser());
    const out = await me("u-1");
    expect(out).toMatchObject({ id: "u-1", email: "alice@example.com", roles: ["ALUMNI"] });
    expect((out as any).passwordHash).toBeUndefined();
  });

  it("loginWithOAuth: existing link → re-issues tokens for that user", async () => {
    prismaMock.oAuthAccount.findUnique.mockResolvedValueOnce({
      user: mkUser(),
    });
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.create.mockResolvedValueOnce({});
    const out = await loginWithOAuth({
      provider: "google",
      providerId: "g-1",
      email: "alice@example.com",
      firstName: "A",
      lastName: "B",
      emailVerified: true,
    } as any);
    expect(out.accessToken).toBeTruthy();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("loginWithOAuth: links to existing-by-email user", async () => {
    prismaMock.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce(mkUser());
    prismaMock.oAuthAccount.create.mockResolvedValueOnce({});
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.create.mockResolvedValueOnce({});
    await loginWithOAuth({
      provider: "google",
      providerId: "g-1",
      email: "alice@example.com",
      firstName: "A",
      lastName: "B",
      emailVerified: true,
    } as any);
    expect(prismaMock.oAuthAccount.create).toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("loginWithOAuth: creates a brand-new APPROVED user when email is provider-verified", async () => {
    prismaMock.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce(mkUser({ status: "APPROVED" }));
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.create.mockResolvedValueOnce({});
    await loginWithOAuth({
      provider: "google",
      providerId: "g-1",
      email: "new@x.com",
      firstName: "N",
      lastName: "U",
      emailVerified: true,
    } as any);
    const createArg = prismaMock.user.create.mock.calls[0][0] as any;
    expect(createArg.data.status).toBe("APPROVED");
  });
});