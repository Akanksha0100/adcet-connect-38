/**
 * The backfill's two load-bearing properties: it works per *city* rather than
 * per profile (which is what keeps it viable at 50,000 alumni), and a city it
 * cannot place is skipped rather than fatal.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const fetchMock = jest.fn<typeof fetch>();
global.fetch = fetchMock as unknown as typeof fetch;

const { runGeoBackfill } = await import("../../jobs/geoBackfill.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  fetchMock.mockReset();
});

describe("runGeoBackfill", () => {
  it("resolves each city once and places every profile in it in one update", async () => {
    // 4,000 alumni spread over two cities must cost two lookups, not 4,000.
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { city: "Pune", country: "India", _count: { _all: 3000 } },
      { city: "Bangalore", country: "India", _count: { _all: 1000 } },
    ]);
    prismaMock.geoLocation.findUnique.mockResolvedValue(null);
    prismaMock.geoLocation.upsert
      .mockResolvedValueOnce({ id: "loc-pune" })
      .mockResolvedValueOnce({ id: "loc-blr" });
    prismaMock.profile.updateMany
      .mockResolvedValueOnce({ count: 3000 })
      .mockResolvedValueOnce({ count: 1000 });

    const result = await runGeoBackfill({ allowRemote: false });

    expect(result).toEqual({ scanned: 2, resolved: 2, unresolved: 0, profilesUpdated: 4000 });
    expect(prismaMock.profile.updateMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.profile.updateMany).toHaveBeenCalledWith({
      where: { city: "Pune", country: "India", locationId: null },
      data: { locationId: "loc-pune" },
    });
  });

  it("only looks at profiles that aren't placed yet, busiest city first", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([]);

    await runGeoBackfill({ limit: 50, allowRemote: false });

    expect(prismaMock.profile.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locationId: null, city: { not: null } },
        orderBy: { _count: { city: "desc" } },
        take: 50,
      }),
    );
  });

  it("skips a city it cannot place and keeps going", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { city: "Nowhereville", country: "India", _count: { _all: 2 } },
      { city: "Pune", country: "India", _count: { _all: 5 } },
    ]);
    prismaMock.geoLocation.findUnique.mockResolvedValue(null);
    prismaMock.geoLocation.upsert.mockResolvedValueOnce({ id: "loc-pune" });
    prismaMock.profile.updateMany.mockResolvedValueOnce({ count: 5 });

    const result = await runGeoBackfill({ allowRemote: false });

    expect(result).toEqual({ scanned: 2, resolved: 1, unresolved: 1, profilesUpdated: 5 });
  });

  it("stays offline when the seed asks it to", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([
      { city: "Nowhereville", country: "India", _count: { _all: 1 } },
    ]);
    prismaMock.geoLocation.findUnique.mockResolvedValue(null);

    await runGeoBackfill({ allowRemote: false });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does no work when every profile is already placed", async () => {
    prismaMock.profile.groupBy.mockResolvedValueOnce([]);

    const result = await runGeoBackfill({ allowRemote: false });

    expect(result).toEqual({ scanned: 0, resolved: 0, unresolved: 0, profilesUpdated: 0 });
    expect(prismaMock.profile.updateMany).not.toHaveBeenCalled();
  });
});
