/**
 * Branch-coverage tests for the Alumni search service.
 * Verifies every conditional in the dynamic `where` clause builder
 * (q, city, company, department, year, year range, and combinations).
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const svc = await import("../../../modules/alumni/alumni.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  prismaMock.profile.findMany.mockResolvedValue([]);
  prismaMock.profile.count.mockResolvedValue(0);
});

const callWith = async (q: any) => {
  await svc.search({ page: 1, pageSize: 10, ...q });
  return (prismaMock.profile.findMany.mock.calls.at(-1)![0] as any).where;
};

describe("modules/alumni/service — search where-builder", () => {
  it("baseline only filters approved users", async () => {
    const where = await callWith({});
    expect(where.user).toEqual({ status: "APPROVED" });
    expect(where.city).toBeUndefined();
  });

  it("applies city / company / department fuzzy filters", async () => {
    const where = await callWith({ city: "Pune", company: "Acme", department: "CS" });
    expect(where.city.contains).toBe("Pune");
    expect(where.currentCompany.contains).toBe("Acme");
    expect(where.department.contains).toBe("CS");
  });

  it("graduationYear exact match overrides ranges branch", async () => {
    const where = await callWith({ graduationYear: 2020 });
    expect(where.graduationYear).toBe(2020);
  });

  it("graduationYearMin only", async () => {
    const where = await callWith({ graduationYearMin: 2018 });
    expect(where.graduationYear).toEqual({ gte: 2018 });
  });

  it("graduationYearMax only", async () => {
    const where = await callWith({ graduationYearMax: 2022 });
    expect(where.graduationYear).toEqual({ lte: 2022 });
  });

  it("both min and max produce a range", async () => {
    const where = await callWith({ graduationYearMin: 2010, graduationYearMax: 2020 });
    expect(where.graduationYear).toEqual({ gte: 2010, lte: 2020 });
  });

  it("free-text search covers first name, last name and company — nothing else", async () => {
    const where = await callWith({ q: "alice" });
    expect(where.AND).toHaveLength(1);
    expect(where.AND[0].OR).toEqual([
      { user: { firstName: { contains: "alice", mode: "insensitive" } } },
      { user: { lastName: { contains: "alice", mode: "insensitive" } } },
      { currentCompany: { contains: "alice", mode: "insensitive" } },
    ]);
  });

  it("every word in a full name must match, so surnames narrow the result", async () => {
    const where = await callWith({ q: "alice kulkarni" });
    expect(where.AND).toHaveLength(2);
  });

  it("multi-select department and batch filters use an IN clause", async () => {
    const where = await callWith({
      departments: ["Civil Engineering", "Food Technology"],
      graduationYears: [2019, 2020],
    });
    expect(where.department).toEqual({ in: ["Civil Engineering", "Food Technology"] });
    expect(where.graduationYear).toEqual({ in: [2019, 2020] });
  });

  it("returns paginated shape", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([{ id: "p-1" }]);
    prismaMock.profile.count.mockResolvedValueOnce(1);
    const out = await svc.search({ page: 1, pageSize: 10 } as any);
    expect(out.items).toHaveLength(1);
    expect(out.pagination.total).toBe(1);
  });
});