/**
 * City → coordinate resolution for the alumni map.
 *
 * The map never geocodes at request time. Coordinates are resolved **once per
 * city** and stored on `GeoLocation`; a profile just points at the row. That is
 * what makes the map cheap at 50,000 alumni — the aggregation is a `groupBy` on
 * `locationId` over a handful of hundred distinct places.
 *
 * Resolution order:
 *
 *   1. An existing `GeoLocation` row (free — the common case once warm).
 *   2. The offline gazetteer in `config/gazetteer.ts` (free, no network).
 *   3. Nominatim, but **only** when explicitly asked for via `allowRemote`,
 *      which the backfill job passes and request handlers never do. No profile
 *      save ever blocks on an outbound HTTP call.
 *
 * Privacy: only `city` and `country` are ever sent to the geocoder and only a
 * city centroid comes back, so nothing here can produce — or store — a
 * coordinate more precise than the city an alumnus chose to publish. The
 * rounding below enforces that even if a geocoder returns rooftop precision.
 */
import { GeoSource } from "@prisma/client";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";
import { env } from "../config/env.js";
import {
  GAZETTEER,
  GazetteerEntry,
  normaliseKey,
  locationSlug,
  roundCoord,
} from "../config/gazetteer.js";

// Defined in `config/gazetteer.ts` (which imports nothing, so the production
// bootstrap script can use them too) and re-exported here as part of this
// module's public surface.
export { normaliseKey, locationSlug, roundCoord, GEO_PRECISION } from "../config/gazetteer.js";

const gazetteerIndex = new Map<string, GazetteerEntry>();
for (const entry of GAZETTEER) {
  for (const name of [entry.city, ...(entry.aliases ?? [])]) {
    gazetteerIndex.set(normaliseKey(name), entry);
  }
}

/**
 * Look a free-text city up in the offline gazetteer.
 *
 * The gazetteer entry's own country wins over the profile's: `country` defaults
 * to "India" on every profile and is rarely edited, so an alumnus in London
 * would otherwise be plotted in the wrong hemisphere. A city name is the more
 * specific signal, and unknown cities keep whatever country the profile says.
 */
export const lookupGazetteer = (city: string): GazetteerEntry | null =>
  gazetteerIndex.get(normaliseKey(city)) ?? null;

export interface ResolvedPlace {
  city: string;
  state?: string | null;
  country: string;
  lat: number;
  lng: number;
  source: GeoSource;
}

// --- Nominatim -------------------------------------------------------------

let lastRemoteCallAt = 0;

/**
 * Nominatim's usage policy allows at most one request per second from a single
 * application. The backfill walks cities serially through this gate rather than
 * firing a burst that would get the deployment blocked.
 */
const throttleRemote = async () => {
  const wait = lastRemoteCallAt + env.GEOCODER_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRemoteCallAt = Date.now();
};

interface NominatimHit {
  lat: string;
  lon: string;
  name?: string;
  address?: { state?: string; country?: string };
}

/** Query Nominatim for a city centroid. Returns `null` on any failure — a miss is never fatal. */
export const geocodeRemote = async (city: string, country: string): Promise<ResolvedPlace | null> => {
  if (env.GEOCODER === "none") return null;

  await throttleRemote();
  const url = new URL("/search", env.GEOCODER_BASE_URL);
  url.searchParams.set("city", city);
  url.searchParams.set("country", country);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.GEOCODER_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": env.GEOCODER_USER_AGENT, "Accept-Language": "en" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      logger.warn({ city, country, status: res.status }, "geocoder returned a non-OK response");
      return null;
    }
    const hits = (await res.json()) as NominatimHit[];
    const hit = hits?.[0];
    if (!hit) return null;

    return {
      city,
      state: hit.address?.state ?? null,
      country: hit.address?.country ?? country,
      lat: roundCoord(Number(hit.lat)),
      lng: roundCoord(Number(hit.lon)),
      source: GeoSource.NOMINATIM,
    };
  } catch (err) {
    logger.warn({ err, city, country }, "geocoder lookup failed");
    return null;
  }
};

// --- Resolution ------------------------------------------------------------

export interface ResolveOptions {
  /** Allow a Nominatim call on a gazetteer miss. Backfill only — never a request path. */
  allowRemote?: boolean;
}

/**
 * Find — or create — the `GeoLocation` row for a free-text city.
 *
 * Returns `null` when the place cannot be resolved; the caller leaves
 * `locationId` unset and the alumnus is reported as unplaced rather than being
 * dropped from the headline count.
 */
export const resolveLocation = async (
  city: string | null | undefined,
  country: string | null | undefined,
  { allowRemote = false }: ResolveOptions = {},
): Promise<{ id: string } | null> => {
  const rawCity = city?.trim();
  if (!rawCity) return null;
  const rawCountry = country?.trim() || "India";

  // 1. Already known under the name as given.
  const asGiven = await prisma.geoLocation.findUnique({
    where: { slug: locationSlug(rawCity, rawCountry) },
    select: { id: true },
  });
  if (asGiven) return asGiven;

  // 2. Offline gazetteer, then 3. the remote geocoder.
  const gaz = lookupGazetteer(rawCity);
  const place: ResolvedPlace | null = gaz
    ? {
        city: gaz.city,
        state: gaz.state ?? null,
        country: gaz.country,
        lat: roundCoord(gaz.lat),
        lng: roundCoord(gaz.lng),
        source: GeoSource.GAZETTEER,
      }
    : allowRemote
      ? await geocodeRemote(rawCity, rawCountry)
      : null;

  if (!place) return null;

  // The canonical name may differ from the spelling supplied ("Bangalore" →
  // "Bengaluru"), so upsert on the *canonical* slug: every spelling of a city
  // converges on one row, and therefore one point on the map.
  const slug = locationSlug(place.city, place.country);
  const row = await prisma.geoLocation.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      city: place.city,
      state: place.state ?? null,
      country: place.country,
      lat: place.lat,
      lng: place.lng,
      source: place.source,
    },
    select: { id: true },
  });
  return row;
};

/**
 * Keep a profile's `locationId` in step with its city.
 *
 * Called after any write that can change `city`/`country`. Best-effort by
 * design: a profile save must never fail because a city could not be placed on
 * a map, so callers pass the result straight into the update they were already
 * making, or ignore it.
 */
export const resolveProfileLocation = async (
  city: string | null | undefined,
  country: string | null | undefined,
  options?: ResolveOptions,
): Promise<string | null> => {
  try {
    const loc = await resolveLocation(city, country, options);
    return loc?.id ?? null;
  } catch (err) {
    logger.warn({ err, city, country }, "location resolution failed; profile left unplaced");
    return null;
  }
};
