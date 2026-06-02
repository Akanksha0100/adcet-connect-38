/**
 * Unit tests for the resume retention sweep.
 * Validates: cutoff filter, storage-delete + DB null-out, failure isolation.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma: prismaMock }));
const storageDelete = jest.fn(async () => undefined);
jest.unstable_mockModule("../../storage/index.js", () => ({
  getStorage: () => ({ delete: storageDelete }),
}));

const { runResumeCleanup } = await import("../../jobs/resumeCleanup.js");

beforeEach(() => {
  storageDelete.mockReset();
  storageDelete.mockResolvedValue(undefined);
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("runResumeCleanup", () => {
  it("queries with retention cutoff and nulls resumeKey after delete", async () => {
    prismaMock.jobApplication.findMany.mockResolvedValueOnce([
      { id: "a1", resumeKey: "k1" },
      { id: "a2", resumeKey: "k2" },
    ]);
    prismaMock.jobApplication.update.mockResolvedValue({});
    const out = await runResumeCleanup(30);
    expect(out).toEqual({ scanned: 2, deleted: 2, failed: 0 });
    expect(storageDelete).toHaveBeenCalledTimes(2);
    expect(prismaMock.jobApplication.update).toHaveBeenCalledTimes(2);
    const where = (prismaMock.jobApplication.findMany.mock.calls[0][0] as any).where;
    expect(where.resumeKey).toEqual({ not: null });
    expect(where.createdAt.lt).toBeInstanceOf(Date);
  });

  it("isolates storage failures and continues with other rows", async () => {
    prismaMock.jobApplication.findMany.mockResolvedValueOnce([
      { id: "a1", resumeKey: "k1" },
      { id: "a2", resumeKey: "k2" },
    ]);
    storageDelete.mockRejectedValueOnce(new Error("s3 down"));
    prismaMock.jobApplication.update.mockResolvedValue({});
    const out = await runResumeCleanup(180);
    expect(out).toEqual({ scanned: 2, deleted: 1, failed: 1 });
    expect(prismaMock.jobApplication.update).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts when no rows match", async () => {
    prismaMock.jobApplication.findMany.mockResolvedValueOnce([]);
    const out = await runResumeCleanup(90);
    expect(out).toEqual({ scanned: 0, deleted: 0, failed: 0 });
    expect(storageDelete).not.toHaveBeenCalled();
  });
});