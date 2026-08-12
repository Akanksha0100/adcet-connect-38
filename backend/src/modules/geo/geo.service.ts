import { prisma } from "../../lib/prisma.js";
import { CAMPUS } from "../../config/gazetteer.js";

/**
 * Aggregate alumni count grouped by city — feeds the admin Geo Map lists.
 */
export const cities = async () => {
  const grouped = await prisma.profile.groupBy({
    by: ["city"],
    where: { city: { not: null }, user: { status: "APPROVED" } },
    _count: { _all: true },
  });
  return grouped
    .filter((g) => g.city)
    .map((g) => ({ city: g.city as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
};

/**
 * City counts for the public alumni map. Same aggregation as `cities()` but
 * exposed without a session, so it deliberately returns nothing beyond a city
 * name and a headcount — no names, employers or profile identifiers.
 */
export const publicCities = async () => cities();

export const companies = async () => {
  const grouped = await prisma.profile.groupBy({
    by: ["currentCompany"],
    where: { currentCompany: { not: null }, user: { status: "APPROVED" } },
    _count: { _all: true },
  });
  return grouped
    .filter((g) => g.currentCompany)
    .map((g) => ({ company: g.currentCompany as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
};

/** City × Company breakdown — used by the Admin Geo Map side panel. */
export const cityCompanyBreakdown = async () => {
  const profiles = await prisma.profile.findMany({
    where: { city: { not: null }, currentCompany: { not: null }, user: { status: "APPROVED" } },
    select: { city: true, currentCompany: true },
  });
  const map = new Map<string, Map<string, number>>();
  for (const p of profiles) {
    if (!p.city || !p.currentCompany) continue;
    if (!map.has(p.city)) map.set(p.city, new Map());
    const inner = map.get(p.city)!;
    inner.set(p.currentCompany, (inner.get(p.currentCompany) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([city, comps]) => ({
    city,
    totalAlumni: Array.from(comps.values()).reduce((a, b) => a + b, 0),
    companies: Array.from(comps.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count),
  }));
};

// === Alumni map ============================================================

export interface MapPoint {
  id: string;
  city: string;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  count: number;
}

export interface AlumniMapData {
  points: MapPoint[];
  countries: { country: string; count: number }[];
  totals: {
    /** Approved alumni in total, whether or not they have a placeable city. */
    alumni: number;
    /** Approved alumni plotted on the map. */
    placed: number;
    /** Approved alumni who listed a city the geocoder hasn't resolved yet. */
    unplaced: number;
    cities: number;
    countries: number;
  };
  campus: typeof CAMPUS;
  generatedAt: string;
}

/**
 * Everything the alumni map renders, as **one pre-aggregated payload**.
 *
 * Cost is independent of how many alumni exist: three indexed aggregate queries
 * plus one read of the (small) `GeoLocation` table. At 50,000 alumni across a
 * few hundred cities the response is a few hundred rows, which the client then
 * clusters with supercluster — so neither side ever handles 50,000 markers.
 *
 * The payload is deliberately identical for signed-in and anonymous callers: a
 * city name and a headcount, never a name, employer or profile id. Coordinates
 * are the shared city centroids stored on `GeoLocation`, so no alumnus can be
 * located more precisely than the city they published.
 */
export const alumniMap = async (): Promise<AlumniMapData> => {
  const approved = { user: { status: "APPROVED" as const } };

  const [grouped, totalAlumni, unplaced] = await Promise.all([
    prisma.profile.groupBy({
      by: ["locationId"],
      where: { ...approved, locationId: { not: null } },
      _count: { _all: true },
    }),
    prisma.profile.count({ where: approved }),
    prisma.profile.count({ where: { ...approved, locationId: null, city: { not: null } } }),
  ]);

  const counts = new Map<string, number>();
  for (const g of grouped) {
    if (g.locationId) counts.set(g.locationId, g._count._all);
  }

  const locations = counts.size
    ? await prisma.geoLocation.findMany({ where: { id: { in: [...counts.keys()] } } })
    : [];

  const points: MapPoint[] = locations
    .map((l) => ({
      id: l.id,
      city: l.city,
      state: l.state,
      country: l.country,
      lat: l.lat,
      lng: l.lng,
      count: counts.get(l.id) ?? 0,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const byCountry = new Map<string, number>();
  for (const p of points) byCountry.set(p.country, (byCountry.get(p.country) ?? 0) + p.count);

  return {
    points,
    countries: [...byCountry.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
    totals: {
      alumni: totalAlumni,
      placed: points.reduce((s, p) => s + p.count, 0),
      unplaced,
      cities: points.length,
      countries: byCountry.size,
    },
    campus: CAMPUS,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Short-lived cache in front of `alumniMap()`.
 *
 * The map is the most-hit public endpoint on the site and its data only changes
 * when someone edits their city, so a minute of staleness is invisible to
 * visitors and removes the aggregation from the hot path entirely. Failures are
 * not cached — an errored load retries on the next request.
 */
const CACHE_TTL_MS = 60_000;
let cached: { at: number; data: AlumniMapData } | null = null;

export const alumniMapCached = async (): Promise<AlumniMapData> => {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
  const data = await alumniMap();
  cached = { at: Date.now(), data };
  return data;
};

/** Drop the cached payload — called after a backfill run rewrites coordinates. */
export const invalidateMapCache = () => {
  cached = null;
};
