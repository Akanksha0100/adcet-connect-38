import Supercluster from "supercluster";
import type { ClusterFeature, PointFeature } from "supercluster";
import { api } from "./api";

/**
 * One place on the alumni map: a city centroid and how many alumni are in it.
 *
 * There is deliberately no per-alumnus point. The backend aggregates by city
 * before it answers, so nothing here can identify an individual and the payload
 * stays a few hundred rows however many alumni the directory holds.
 */
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
    alumni: number;
    placed: number;
    unplaced: number;
    cities: number;
    countries: number;
  };
  campus: { name: string; state?: string; country: string; lat: number; lng: number };
  generatedAt: string;
}

/**
 * The map data.
 *
 * `anonymous` keeps a stale token from triggering a refresh/sign-out on the
 * public page; the in-portal page passes `false` and uses the authenticated
 * route, which returns exactly the same shape.
 */
export const alumniMapQuery = (anonymous = true) => ({
  queryKey: ["geo", "map", anonymous ? "public" : "member"] as const,
  queryFn: () =>
    anonymous
      ? api.get<AlumniMapData>("/geo/public/map", undefined, { anonymous: true })
      : api.get<AlumniMapData>("/geo/map"),
  // The server already caches for a minute; don't re-fetch on every focus.
  staleTime: 60_000,
});

/** Compact headcount for a marker badge: 42, 1.2k, 12k. */
export const compactCount = (n: number) => {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
};

/** "Pune, Maharashtra, India" — skips the state for places that have none. */
export const placeLabel = (p: Pick<MapPoint, "city" | "state" | "country">) =>
  [p.city, p.state, p.country].filter(Boolean).join(", ");

export const pluralAlumni = (n: number) => `${n.toLocaleString()} ${n === 1 ? "alumnus" : "alumni"}`;

// === Clustering ============================================================

export interface LeafProps {
  pointId: string;
  city: string;
  state: string | null;
  country: string;
  /** Alumni at this city — the weight every cluster sums. */
  count: number;
}

export interface ClusterProps {
  alumni: number;
}

/** Zoom past which a lone city no longer merges into a cluster. */
export const CLUSTER_MAX_ZOOM = 11;

/**
 * Index the city points for clustering.
 *
 * supercluster builds a KD-tree per zoom level once, then answers
 * `getClusters(bbox, zoom)` in time proportional to what is *on screen* — which
 * is what keeps the map responsive whether the directory holds 50 alumni or
 * 50,000. Zooming in re-queries at the finer level, so clusters split into
 * smaller clusters and finally into individual cities.
 *
 * The `map`/`reduce` pair is the important part: a cluster's `alumni` is the
 * **summed headcount** of the cities inside it, so a marker over Maharashtra
 * reads "287 alumni". supercluster's built-in `point_count` would say "9",
 * meaning nine city points — a number no visitor is asking for.
 */
export const buildClusterIndex = (points: MapPoint[]) => {
  const index = new Supercluster<LeafProps, ClusterProps>({
    radius: 68,
    maxZoom: CLUSTER_MAX_ZOOM,
    minPoints: 2,
    map: (props) => ({ alumni: props.count }),
    reduce: (accumulated, props) => {
      accumulated.alumni += props.alumni;
    },
  });

  index.load(
    points.map((p) => ({
      type: "Feature" as const,
      properties: {
        pointId: p.id,
        city: p.city,
        state: p.state,
        country: p.country,
        count: p.count,
      },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  );

  return index;
};

/** The whole world, for querying every cluster at a given zoom. */
export const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

/** What `getClusters` hands back: either a merged group or a single city. */
export type MapFeature = ClusterFeature<ClusterProps> | PointFeature<LeafProps>;

export const isCluster = (f: MapFeature): f is ClusterFeature<ClusterProps> =>
  Boolean((f.properties as { cluster?: boolean }).cluster);

/** Alumni represented by a feature, whichever kind it is. */
export const featureAlumni = (f: MapFeature) =>
  isCluster(f) ? f.properties.alumni : f.properties.count;
