/**
 * Users service: preference upsert behaviour, password change happy + failure
 * paths, and refresh-token revocation on password change.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { hashPassword } = await import("../../../lib/password.js");
const svc = await import("../../../modules/users/users.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("users.service — getPreferences", () => {
  it("returns existing preferences when present", async () => {
    prismaMock.userPreferences.findUnique.mockResolvedValueOnce({ userId: "u-1" });
    expect(await svc.getPreferences("u-1")).toEqual({ userId: "u-1" });
    expect(prismaMock.userPreferences.create).not.toHaveBeenCalled();
  });
  it("creates a default row when missing", async () => {
    prismaMock.userPreferences.findUnique.mockResolvedValueOnce(null);
    prismaMock.userPreferences.create.mockResolvedValueOnce({ userId: "u-1" });
    expect(await svc.getPreferences("u-1")).toEqual({ userId: "u-1" });
  });
});

describe("users.service — updatePreferences", () => {
  it("upserts on userId", async () => {
    prismaMock.userPreferences.upsert.mockResolvedValueOnce({});
    await svc.updatePreferences("u-1", { notificationsEmail: false });
    expect((prismaMock.userPreferences.upsert.mock.calls[0][0] as any).where).toEqual({ userId: "u-1" });
  });
});

describe("users.service — changePassword", () => {
  it("404 when user missing", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.changePassword("u-1", "x", "y")).rejects.toMatchObject({ status: 404 });
  });
  it("404 when user has no passwordHash (OAuth-only account)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", passwordHash: null });
    await expect(svc.changePassword("u-1", "x", "y")).rejects.toMatchObject({ status: 404 });
  });
  it("401 when current password mismatch", async () => {
    const hash = await hashPassword("RealPass#1");
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", passwordHash: hash });
    await expect(svc.changePassword("u-1", "WrongPass", "Brand#New1")).rejects.toMatchObject({
      status: 401,
    });
  });
  it("on success: rotates passwordHash and revokes outstanding refresh tokens", async () => {
    const hash = await hashPassword("RealPass#1");
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", passwordHash: hash });
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 });
    await svc.changePassword("u-1", "RealPass#1", "Brand#New1");
    expect((prismaMock.user.update.mock.calls[0][0] as any).data.passwordHash).not.toBe(hash);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("users.service — updateMe", () => {
  it("forwards firstName/lastName patch", async () => {
    prismaMock.user.update.mockResolvedValueOnce({});
    await svc.updateMe("u-1", { firstName: "New" });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { firstName: "New" },
    });
  });
});