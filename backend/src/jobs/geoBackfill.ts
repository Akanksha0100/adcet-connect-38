/**
 * Places alumni on the map who aren't on it yet.
 *
 * This is where the *slow* half of geocoding lives. Request paths only ever
 * consult the offline gazetteer, so anyone who typed a city it doesn't know
 * lands here with `locationId = null`; this sweep resolves those cities against
 * Nominatim — at one request per second, per its usage policy — and writes the
 * answer to `GeoLocation` so it is never looked up again.
 *
 * Two properties make it safe to run on a schedule:
 *
 *   - **It works per distinct city, not per profile.** 50,000 unplaced alumni
 *     in 30 unknown cities cost 30 geocodes, then one `updateMany` each.
 *   - **It is idempotent.** Profiles already carrying a `locationId` are
 *     excluded by the query, and cities already in `GeoLocation` short-circuit
 *     before any network call, so a re-run of a finished sweep does nothing.
 *
 * Unresolvable cities (typos, "Remote", a district rather than a town) are
 * simply left unplaced and retried next sweep; they still show in the map's
 * "not plotted yet" count.
 */
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { resolveLocation } from "../lib/geocode.js";
import { invalidateMapCache } from "../modules/geo/geo.service.js";

export interface GeoBackfillResult {
  /** Distinct city/country pairs that needed placing. */
  scanned: number;
  /** Pairs successfully resolved to a `GeoLocation`. */
  resolved: number;
  /** Pairs no geocoder could place. */
  unresolved: number;
  /** Profile rows given a `locationId`. */
  profilesUpdated: number;
}

export interface GeoBackfillOptions {
  /** Cap on distinct cities resolved in one sweep. */
  limit?: number;
  /**
   * Allow Nominatim lookups for cities the gazetteer doesn't know. The seed
   * turns this off so `npm run seed` stays offline and deterministic.
   */
  allowRemote?: boolean;
}

export const runGeoBackfill = async ({
  limit = 200,
  allowRemote = true,
}: GeoBackfillOptions = {}): Promise<GeoBackfillResult> => {
  const pending = await prisma.profile.groupBy({
    by: ["city", "country"],
    where: { locationId: null, city: { not: null } },
    _count: { _all: true },
    // Busiest cities first, so a capped run buys the most map coverage.
    orderBy: { _count: { city: "desc" } },
    take: limit,
  });

  const result: GeoBackfillResult = { scanned: pending.length, resolved: 0, unresolved: 0, profilesUpdated: 0 };

  for (const row of pending) {
    const city = row.city;
    if (!city) continue;

    const location = await resolveLocation(city, row.country, { allowRemote });
    if (!location) {
      result.unresolved += 1;
      logger.debug({ city, country: row.country }, "city could not be placed; will retry next sweep");
      continue;
    }
    result.resolved += 1;

    const updated = await prisma.profile.updateMany({
      where: { city, country: row.country, locationId: null },
      data: { locationId: location.id },
    });
    result.profilesUpdated += updated.count;
  }

  if (result.profilesUpdated > 0) invalidateMapCache();
  logger.info(result, "geo backfill complete");
  return result;
};

/** Wire a daily sweep. Returns a stop handle for graceful shutdown / tests. */
export const startGeoBackfillCron = (intervalMs = 24 * 60 * 60 * 1000) => {
  const handle = setInterval(() => {
    runGeoBackfill().catch((err: unknown) => logger.error({ err }, "geo backfill sweep crashed"));
  }, intervalMs);
  handle.unref?.();
  return () => clearInterval(handle);
};
