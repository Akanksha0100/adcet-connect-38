/**
 * Branch coverage for analytics aggregations.
 * Hits null/empty grouping rows, the year-sort comparator's nullable branch,
 * and admin-vs-public overview shapes.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const svc = await import("../../../modules/analytics/analytics.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("analytics.service — overview", () => {
  it("uses 0 when donation aggregate _sum.amount is null", async () => {
    prismaMock.user.count.mockResolvedValueOnce(10);
    prismaMock.userRole.count.mockResolvedValueOnce(8);
    prismaMock.event.count.mockResolvedValueOnce(2);
    prismaMock.job.count.mockResolvedValueOnce(3);
    prismaMock.achievement.count.mockResolvedValueOnce(4);
    prismaMock.donation.aggregate.mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 });
    const out = await svc.overview();
    expect(out.totalDonationsAmount).toBe(0);
    expect(out.totalUsers).toBe(10);
  });

  it("forwards aggregate amount when present", async () => {
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.userRole.count.mockResolvedValueOnce(0);
    prismaMock.event.count.mockResolvedValueOnce(0);
    prismaMock.job.count.mockResolvedValueOnce(0);
    prismaMock.achievement.count.mockResolvedValueOnce(0);
    prismaMock.donation.aggregate.mockResolvedValueOnce({ _sum: { amount: 5000 }, _count: 5 });
    const out = await svc.overview();
    expect(out.totalDonationsAmount).toBe(5000);
  });
});

describe("analytics.service — alumniByYear", () => {
  it("filters out null years and sorts ascending (handles undefined years)", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { graduationYear: 2021, _count: { _all: 3 } },
      { graduationYear: null, _count: { _all: 99 } },
      { graduationYear: 2018, _count: { _all: 5 } },
    ]);
    const out = await svc.alumniByYear();
    expect(out.map((r) => r.year)).toEqual([2018, 2021]);
  });

  it("empty group returns empty array", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([]);
    expect(await svc.alumniByYear()).toEqual([]);
  });
});

describe("analytics.service — departmentBreakdown", () => {
  it("maps grouped rows to {department, count}", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { department: "CS", _count: { _all: 4 } },
      { department: "EE", _count: { _all: 2 } },
    ]);
    const out = await svc.departmentBreakdown();
    expect(out).toEqual([
      { department: "CS", count: 4 },
      { department: "EE", count: 2 },
    ]);
  });
});

describe("analytics.service — adminOverview", () => {
  it("returns the four pending counters in parallel", async () => {
    prismaMock.user.count.mockResolvedValueOnce(1);
    prismaMock.event.count.mockResolvedValueOnce(2);
    prismaMock.job.count.mockResolvedValueOnce(3);
    prismaMock.achievement.count.mockResolvedValueOnce(4);
    expect(await svc.adminOverview()).toEqual({
      pendingUsers: 1,
      pendingEvents: 2,
      pendingJobs: 3,
      pendingAchievements: 4,
    });
  });
});