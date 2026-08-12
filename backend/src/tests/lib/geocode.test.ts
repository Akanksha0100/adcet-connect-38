/**
 * Geocoding: key normalisation, gazetteer aliasing, coordinate coarsening, and
 * the rule that request paths never reach the network.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const fetchMock = jest.fn<typeof fetch>();
global.fetch = fetchMock as unknown as typeof fetch;

const geo = await import("../../lib/geocode.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  fetchMock.mockReset();
});

describe("normaliseKey / locationSlug", () => {
  it("folds case, spacing and punctuation together", () => {
    expect(geo.normaliseKey("New Delhi")).toBe("newdelhi");
    expect(geo.normaliseKey("new-delhi")).toBe("newdelhi");
    expect(geo.normaliseKey("  NEW  DELHI ")).toBe("newdelhi");
  });

  it("keys a place by city and country together", () => {
    expect(geo.locationSlug("Pune", "India")).toBe("pune|india");
    // Same city name in two countries must never collapse to one point.
    expect(geo.locationSlug("Birmingham", "United Kingdom")).not.toBe(
      geo.locationSlug("Birmingham", "United States"),
    );
  });
});

describe("lookupGazetteer", () => {
  it("resolves alternative spellings to the same canonical city", () => {
    expect(geo.lookupGazetteer("Bangalore")).toBe(geo.lookupGazetteer("Bengaluru"));
    expect(geo.lookupGazetteer("gurgaon")?.city).toBe("Gurugram");
    expect(geo.lookupGazetteer("BOMBAY")?.city).toBe("Mumbai");
  });

  it("returns null for a place it doesn't know", () => {
    expect(geo.lookupGazetteer("Nowhereville")).toBeNull();
  });
});

describe("roundCoord", () => {
  it("coarsens coordinates to city precision", () => {
    // A rooftop-precision latitude must not survive into the database.
    expect(geo.roundCoord(18.5204303)).toBe(18.52);
    expect(String(geo.roundCoord(73.8567437)).split(".")[1]).toHaveLength(geo.GEO_PRECISION);
  });
});

describe("resolveLocation", () => {
  it("reuses an existing row without touching the gazetteer or the network", async () => {
    prismaMock.geoLocation.findUnique.mockResolvedValueOnce({ id: "loc-1" });

    expect(await geo.resolveLocation("Pune", "India")).toEqual({ id: "loc-1" });
    expect(prismaMock.geoLocation.upsert).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the row from the gazetteer under the canonical slug", async () => {
    prismaMock.geoLocation.findUnique.mockResolvedValueOnce(null);
    prismaMock.geoLocation.upsert.mockResolvedValueOnce({ id: "loc-blr" });

    // Asked for "Bangalore"; must be stored as, and keyed by, "Bengaluru".
    expect(await geo.resolveLocation("Bangalore", "India")).toEqual({ id: "loc-blr" });
    const arg = prismaMock.geoLocation.upsert.mock.calls[0][0] as any;
    expect(arg.where.slug).toBe("bengaluru|india");
    expect(arg.create).toMatchObject({ city: "Bengaluru", state: "Karnataka", country: "India" });
  });

  it("lets the gazetteer's country win over a stale profile default", async () => {
    prismaMock.geoLocation.findUnique.mockResolvedValueOnce(null);
    prismaMock.geoLocation.upsert.mockResolvedValueOnce({ id: "loc-lon" });

    // `country` defaults to India on every profile and is rarely edited, so an
    // alumnus in London would otherwise be plotted in the wrong hemisphere.
    await geo.resolveLocation("London", "India");
    expect((prismaMock.geoLocation.upsert.mock.calls[0][0] as any).create.country).toBe(
      "United Kingdom",
    );
  });

  it("does not call the geocoder on a request path", async () => {
    prismaMock.geoLocation.findUnique.mockResolvedValueOnce(null);

    // Unknown city, `allowRemote` left at its default: unplaced, not slow.
    expect(await geo.resolveLocation("Nowhereville", "India")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.geoLocation.upsert).not.toHaveBeenCalled();
  });

  it("falls through to the geocoder only when the backfill asks", async () => {
    prismaMock.geoLocation.findUnique.mockResolvedValueOnce(null);
    prismaMock.geoLocation.upsert.mockResolvedValueOnce({ id: "loc-new" });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { lat: "26.8467123", lon: "80.9462456", address: { state: "Uttar Pradesh", country: "India" } },
      ],
    } as Response);

    expect(await geo.resolveLocation("Nowhereville", "India", { allowRemote: true })).toEqual({
      id: "loc-new",
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string | URL);
    // Only a city and a country are ever sent — never a street or a postcode.
    expect([...url.searchParams.keys()].sort()).toEqual(
      ["addressdetails", "city", "country", "format", "limit"],
    );

    const created = (prismaMock.geoLocation.upsert.mock.calls[0][0] as any).create;
    expect(created).toMatchObject({ lat: 26.847, lng: 80.946, source: "NOMINATIM" });
  });

  it("treats a geocoder failure as an unplaced city rather than an error", async () => {
    prismaMock.geoLocation.findUnique.mockResolvedValueOnce(null);
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(geo.resolveLocation("Nowhereville", "India", { allowRemote: true })).resolves.toBeNull();
  });

  it("ignores a blank city", async () => {
    expect(await geo.resolveLocation("   ", "India")).toBeNull();
    expect(await geo.resolveLocation(null, null)).toBeNull();
    expect(prismaMock.geoLocation.findUnique).not.toHaveBeenCalled();
  });
});

describe("resolveProfileLocation", () => {
  it("never lets a map failure break a profile save", async () => {
    prismaMock.geoLocation.findUnique.mockRejectedValueOnce(new Error("db exploded"));

    await expect(geo.resolveProfileLocation("Pune", "India")).resolves.toBeNull();
  });
});
