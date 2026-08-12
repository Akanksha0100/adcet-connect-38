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

describe("geo.service — alumniMap", () => {
  /** Two cities' worth of alumni, plus one profile the geocoder hasn't placed. */
  const stubMapData = () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { locationId: "loc-pune", _count: { _all: 12 } },
      { locationId: "loc-london", _count: { _all: 3 } },
      // A `null` bucket can't appear given the query's filter, but the mapping
      // must survive one rather than emitting a point with no coordinates.
      { locationId: null, _count: { _all: 99 } },
    ]);
    prismaMock.profile.count
      .mockResolvedValueOnce(20) // total approved
      .mockResolvedValueOnce(5); // approved with a city we couldn't place
    prismaMock.geoLocation.findMany.mockResolvedValueOnce([
      { id: "loc-london", city: "London", state: null, country: "United Kingdom", lat: 51.507, lng: -0.128 },
      { id: "loc-pune", city: "Pune", state: "Maharashtra", country: "India", lat: 18.52, lng: 73.857 },
    ]);
  };

  it("joins headcounts to coordinates and sorts busiest first", async () => {
    stubMapData();
    const out = await svc.alumniMap();

    expect(out.points).toEqual([
      { id: "loc-pune", city: "Pune", state: "Maharashtra", country: "India", lat: 18.52, lng: 73.857, count: 12 },
      { id: "loc-london", city: "London", state: null, country: "United Kingdom", lat: 51.507, lng: -0.128, count: 3 },
    ]);
  });

  it("rolls counts up by country and reports what is and isn't placed", async () => {
    stubMapData();
    const out = await svc.alumniMap();

    expect(out.countries).toEqual([
      { country: "India", count: 12 },
      { country: "United Kingdom", count: 3 },
    ]);
    expect(out.totals).toEqual({ alumni: 20, placed: 15, unplaced: 5, cities: 2, countries: 2 });
  });

  it("never exposes anything finer than a city", async () => {
    stubMapData();
    const out = await svc.alumniMap();

    // Anything identifying an individual would have to arrive as an extra key.
    for (const point of out.points) {
      expect(Object.keys(point).sort()).toEqual(
        ["city", "count", "country", "id", "lat", "lng", "state"],
      );
    }
  });

  it("skips the location lookup entirely when nobody is placed", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([]);
    prismaMock.profile.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const out = await svc.alumniMap();

    expect(out.points).toEqual([]);
    expect(out.totals.cities).toBe(0);
    expect(prismaMock.geoLocation.findMany).not.toHaveBeenCalled();
  });
});

describe("geo.service — alumniMapCached", () => {
  beforeEach(() => svc.invalidateMapCache());

  const stubOnce = (count: number) => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([{ locationId: "loc-1", _count: { _all: count } }]);
    prismaMock.profile.count.mockResolvedValueOnce(count).mockResolvedValueOnce(0);
    prismaMock.geoLocation.findMany.mockResolvedValueOnce([
      { id: "loc-1", city: "Pune", state: "Maharashtra", country: "India", lat: 18.52, lng: 73.857 },
    ]);
  };

  it("aggregates once and serves the rest from memory", async () => {
    stubOnce(7);

    const first = await svc.alumniMapCached();
    const second = await svc.alumniMapCached();

    expect(second).toBe(first);
    expect(prismaMock.profile.groupBy).toHaveBeenCalledTimes(1);
  });

  it("re-aggregates after the backfill invalidates the cache", async () => {
    stubOnce(7);
    await svc.alumniMapCached();

    svc.invalidateMapCache();
    stubOnce(9);
    const refreshed = await svc.alumniMapCached();

    expect(refreshed.points[0].count).toBe(9);
    expect(prismaMock.profile.groupBy).toHaveBeenCalledTimes(2);
  });
});