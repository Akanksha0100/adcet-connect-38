/**
 * Branch coverage for analytics aggregations.
 * Hits null/empty grouping rows, the year-sort comparator's nullable branch,
 * and admin-vs-public overview shapes.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const sendBulkEmailsMock = jest.fn(async () => ({ sent: 2, failed: 0 }));
jest.unstable_mockModule("../../../lib/mailer.js", () => ({ sendBulkEmails: sendBulkEmailsMock }));
jest.unstable_mockModule("../../../lib/email-templates.js", () => ({
  wrapHtmlEmail: (_t: string, b: string) => b,
}));
jest.unstable_mockModule("../../../storage/index.js", () => ({
  getStorage: () => ({ presignDownload: jest.fn(async () => "http://storage/url") }),
}));

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
describe("analytics.service — adminInsights", () => {
  it("aggregates KPIs, trends and distributions", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ createdAt: new Date("2024-01-15"), status: "APPROVED" }]);
    prismaMock.event.findMany.mockResolvedValueOnce([
      { createdAt: new Date("2024-01-10"), status: "APPROVED", _count: { rsvps: 3 } },
    ]);
    prismaMock.job.findMany.mockResolvedValueOnce([
      { createdAt: new Date("2024-02-01"), status: "APPROVED", isClosed: false },
    ]);
    prismaMock.donation.findMany.mockResolvedValueOnce([
      { createdAt: new Date("2024-02-05"), paidAt: new Date("2024-02-05"), amount: 5000, status: "RECEIVED" },
    ]);
    prismaMock.achievement.findMany.mockResolvedValueOnce([{ createdAt: new Date("2024-03-01"), status: "APPROVED" }]);
    prismaMock.profile.count.mockResolvedValueOnce(42);
    prismaMock.profile.groupBy
      .mockResolvedValueOnce([{ department: "CSE", _count: { _all: 10 } }])
      .mockResolvedValueOnce([{ graduationYear: 2020, _count: { _all: 5 } }])
      .mockResolvedValueOnce([{ currentCompany: "TCS", _count: { _all: 7 } }])
      .mockResolvedValueOnce([{ city: "Pune", _count: { _all: 8 } }]);

    const out = await svc.adminInsights({});
    expect(out.kpis.totalAlumni).toBe(42);
    expect(out.kpis.donationAmount).toBe(5000);
    expect(out.kpis.totalRsvps).toBe(3);
    expect(out.trends.registrations).toHaveLength(1);
    expect(out.distributions.topCities[0]).toEqual({ label: "Pune", value: 8 });
  });
});

describe("analytics.service — sendAlumniBulkEmail", () => {
  it("returns 0 recipients when nothing matches", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([]);
    const out = await svc.sendAlumniBulkEmail("admin-1", { filters: {}, subject: "Hi", html: "<p>x</p>" });
    expect(out).toEqual({ recipientCount: 0, sent: 0, failed: 0 });
    expect(sendBulkEmailsMock).not.toHaveBeenCalled();
  });

  it("sends to matched alumni and records an audit log", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([
      { user: { email: "a@x.com", firstName: "A", lastName: "One" } },
      { user: { email: "b@x.com", firstName: "B", lastName: "Two" } },
    ]);
    prismaMock.auditLog.create.mockResolvedValueOnce({});
    const out = await svc.sendAlumniBulkEmail("admin-1", {
      filters: { company: "TCS" },
      subject: "Hello {{firstName}}",
      html: "<p>Hi {{name}}</p>",
    });
    expect(out.recipientCount).toBe(2);
    expect(sendBulkEmailsMock).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });
});
