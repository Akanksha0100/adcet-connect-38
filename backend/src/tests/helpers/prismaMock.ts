/**
 * Lightweight Prisma mock factory.
 *
 * `jest.mock("../../lib/prisma.js", () => ({ prisma: createPrismaMock() }))` at
 * the top of any service test gives you a fully-stubbed Prisma client where
 * every model exposes the methods we actually use (`findUnique`, `findMany`,
 * `create`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `upsert`).
 *
 * Each method is a `jest.fn()` so individual tests can stub return values per
 * assertion (`prisma.user.findUnique.mockResolvedValue(...)`) without leaking
 * state across tests — the global Jest config sets `clearMocks: true`.
 *
 * Add new models here as they appear in `prisma/schema.prisma`.
 */
import { jest } from "@jest/globals";

const MODEL_METHODS = [
  "findUnique",
  "findFirst",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

const MODELS = [
  "user",
  "userRole",
  "profile",
  "userPreferences",
  "refreshToken",
  "oAuthAccount",
  "event",
  "eventRsvp",
  "job",
  "jobApplication",
  "achievement",
  "donation",
  "donationCampaign",
  "donationLedgerEntry",
  "auditLog",
  "notification",
  "newsItem",
  "resourceItem",
  "supportMessage",
  "siteSection",
  "workExperience",
  "education",
  "skill",
  "profileSkill",
] as const;

export type MockedPrisma = {
  [K in (typeof MODELS)[number]]: { [M in (typeof MODEL_METHODS)[number]]: jest.Mock };
} & {
  $transaction: jest.Mock;
};

export const createPrismaMock = (): MockedPrisma => {
  const out = {} as any;
  for (const m of MODELS) {
    out[m] = {};
    for (const fn of MODEL_METHODS) out[m][fn] = jest.fn();
  }
  // $transaction defaults to running each promise in the array sequentially.
  out.$transaction = jest.fn(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === "function") return arg(out);
    return arg;
  });
  return out;
};