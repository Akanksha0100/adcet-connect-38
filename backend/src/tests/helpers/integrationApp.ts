/**
 * Integration test bootstrap.
 *
 * Builds the full Express app with the real router → middleware → controller →
 * service stack wired up, but with the Prisma client replaced by a deep
 * `jest-mock-extended` mock so we never hit a real database.
 *
 * Usage in a test file (ESM-aware):
 *
 *   import { jest } from "@jest/globals";
 *   import { mockDeep, mockReset } from "jest-mock-extended";
 *   import type { PrismaClient } from "@prisma/client";
 *
 *   const prisma = mockDeep<PrismaClient>();
 *   jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma }));
 *
 *   const { buildApp } = await import("../../../app.js");
 *   const app = buildApp();
 *
 * Tests can then drive endpoints with supertest and stub Prisma per-call:
 *   prisma.user.findUnique.mockResolvedValue({...});
 */
import { mockDeep, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { signAccessToken } from "../../lib/jwt.js";
import type { AppRoleName } from "../../config/constants.js";

export type PrismaMock = DeepMockProxy<PrismaClient>;

export const createPrismaDeepMock = (): PrismaMock => {
  const m = mockDeep<PrismaClient>();
  // Default `$transaction` to a sequential executor that mirrors Prisma's
  // own contract: arrays of promises run in parallel-ish, callbacks receive
  // a tx client (we just hand back the same mock).
  // jest-mock-extended pre-stubs the function, so we override its impl.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (m.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === "function") return arg(m);
    return arg;
  });
  return m;
};

/**
 * Forge a valid access token for a fake user. Use this to authenticate
 * supertest requests against routes guarded by `requireAuth`.
 */
export const makeToken = (
  opts: { sub?: string; email?: string; roles?: AppRoleName[] } = {},
) =>
  signAccessToken({
    sub: opts.sub ?? "user-1",
    email: opts.email ?? "user@example.com",
    roles: opts.roles ?? ["ALUMNI"],
  });

export const bearer = (token: string) => `Bearer ${token}`;