import { describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../helpers/prismaMock.js";
import { buildNext, buildReq, buildRes } from "../helpers/expressMocks.js";
import { ApiError } from "../../lib/errors.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { requireApproved } = await import("../../middlewares/requireApproved.js");

const mkReq = (overrides: Partial<{ sub: string; roles: string[] }> = {}) => {
  const req = buildReq();
  (req as any).auth = { sub: "u-1", email: "a@b.com", roles: ["ALUMNI"], ...overrides };
  return req;
};

describe("middlewares/requireApproved", () => {
  it("401 when no caller is attached", async () => {
    const next = buildNext();
    await requireApproved(buildReq(), buildRes(), next);
    expect((next.mock.calls[0][0] as ApiError).status).toBe(401);
  });

  it("admins bypass the status check entirely (no DB hit)", async () => {
    prismaMock.user.findUnique.mockReset();
    const next = buildNext();
    await requireApproved(mkReq({ roles: ["ADMIN"] }), buildRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("401 when the user row no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const next = buildNext();
    await requireApproved(mkReq(), buildRes(), next);
    expect((next.mock.calls[0][0] as ApiError).status).toBe(401);
  });

  it("403 when the user is PENDING", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ status: "PENDING" });
    const next = buildNext();
    await requireApproved(mkReq(), buildRes(), next);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.status).toBe(403);
    expect(err.message.toLowerCase()).toContain("pending");
  });

  it("403 when the user is REJECTED", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ status: "REJECTED" });
    const next = buildNext();
    await requireApproved(mkReq(), buildRes(), next);
    expect((next.mock.calls[0][0] as ApiError).status).toBe(403);
  });

  it("passes when the user is APPROVED", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ status: "APPROVED" });
    const next = buildNext();
    await requireApproved(mkReq(), buildRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});