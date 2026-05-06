/**
 * Geo aggregation: filters out null cities/companies, sorts desc,
 * and produces the city × company breakdown including empty-input branches.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const svc = await import("../../../modules/geo/geo.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("geo.service — cities", () => {
  it("strips null and sorts desc", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { city: "Pune", _count: { _all: 5 } },
      { city: null, _count: { _all: 100 } },
      { city: "Mumbai", _count: { _all: 20 } },
    ]);
    expect(await svc.cities()).toEqual([
      { city: "Mumbai", count: 20 },
      { city: "Pune", count: 5 },
    ]);
  });
});

describe("geo.service — companies", () => {
  it("strips null and sorts desc", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { currentCompany: null, _count: { _all: 1 } },
      { currentCompany: "Acme", _count: { _all: 4 } },
    ]);
    expect(await svc.companies()).toEqual([{ company: "Acme", count: 4 }]);
  });
});

describe("geo.service — cityCompanyBreakdown", () => {
  it("aggregates by city → company → count", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([
      { city: "Pune", currentCompany: "Acme" },
      { city: "Pune", currentCompany: "Acme" },
      { city: "Pune", currentCompany: "Globex" },
      { city: "Mumbai", currentCompany: "Acme" },
      { city: null, currentCompany: "X" }, // skipped
      { city: "X", currentCompany: null }, // skipped
    ]);
    const out = await svc.cityCompanyBreakdown();
    const pune = out.find((c) => c.city === "Pune")!;
    expect(pune.totalAlumni).toBe(3);
    expect(pune.companies[0]).toEqual({ company: "Acme", count: 2 });
  });

  it("returns [] when no profiles match", async () => {
    prismaMock.profile.findMany.mockResolvedValueOnce([]);
    expect(await svc.cityCompanyBreakdown()).toEqual([]);
  });
});