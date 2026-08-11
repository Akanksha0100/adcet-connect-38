/**
 * Clustering behaviour: aggregation into headcounts, splitting on zoom, and the
 * expansion zoom a cluster click flies to.
 */
import { describe, expect, it } from "vitest";
import { buildClusterIndex, featureAlumni, isCluster, WORLD_BBOX, MapPoint } from "./geo";

const city = (id: string, city: string, lat: number, lng: number, count: number): MapPoint => ({
  id,
  city,
  state: null,
  country: "India",
  lat,
  lng,
  count,
});

/** Four Maharashtra cities plus one far away, so the split is unambiguous. */
const POINTS: MapPoint[] = [
  city("pune", "Pune", 18.52, 73.857, 200),
  city("mumbai", "Mumbai", 19.076, 72.878, 60),
  city("nashik", "Nashik", 19.998, 73.79, 17),
  city("sangli", "Sangli", 16.852, 74.582, 10),
  city("london", "London", 51.507, -0.128, 25),
];

const TOTAL = POINTS.reduce((s, p) => s + p.count, 0);

describe("buildClusterIndex", () => {
  it("labels a cluster with the alumni headcount, not the number of cities", () => {
    const index = buildClusterIndex(POINTS);
    // At world zoom the four Maharashtra cities merge; London is too far away.
    const maharashtra = index.getClusters(WORLD_BBOX, 0).find(isCluster)!;

    // The badge must read 287 alumni — not "4", the number of cities in it.
    expect(maharashtra.properties.alumni).toBe(200 + 60 + 17 + 10);
    expect(maharashtra.properties.point_count).toBe(4);
  });

  it("never loses or double-counts an alumnus at any zoom", () => {
    const index = buildClusterIndex(POINTS);
    for (const zoom of [0, 2, 4, 6, 8, 10, 12, 14]) {
      const total = index.getClusters(WORLD_BBOX, zoom).reduce((s, f) => s + featureAlumni(f), 0);
      expect(total).toBe(TOTAL);
    }
  });

  it("splits clusters into smaller ones as the visitor zooms in", () => {
    const index = buildClusterIndex(POINTS);
    const counts = [0, 3, 5, 8, 12].map((z) => index.getClusters(WORLD_BBOX, z).length);

    // Monotonically non-decreasing, ending with every city on its own.
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts.at(-1)).toBe(POINTS.length);
  });

  it("resolves to individual cities once fully zoomed in", () => {
    const index = buildClusterIndex(POINTS);
    const leaves = index.getClusters(WORLD_BBOX, 14);

    expect(leaves.some(isCluster)).toBe(false);
    expect(leaves.map((f) => (f.properties as { city: string }).city).sort()).toEqual([
      "London",
      "Mumbai",
      "Nashik",
      "Pune",
      "Sangli",
    ]);
  });

  it("gives a cluster click a zoom that actually breaks it apart", () => {
    const index = buildClusterIndex(POINTS);
    const cluster = index.getClusters(WORLD_BBOX, 0).find(isCluster)!;
    const clusterId = cluster.properties.cluster_id;

    const expansionZoom = index.getClusterExpansionZoom(clusterId);
    expect(expansionZoom).toBeGreaterThan(0);
    // At that zoom the map shows more markers than the single cluster clicked.
    expect(index.getClusters(WORLD_BBOX, expansionZoom).length).toBeGreaterThan(1);
  });

  it("handles an empty directory without blowing up", () => {
    expect(buildClusterIndex([]).getClusters(WORLD_BBOX, 4)).toEqual([]);
  });

  it("stays fast with a directory-sized point set", () => {
    // 2,000 cities standing in for 50,000+ alumni — the payload the backend
    // aggregation caps out at. Indexing must stay well under a frame budget.
    const many = Array.from({ length: 2000 }, (_, i) =>
      city(`c${i}`, `City ${i}`, -60 + (i % 120), -180 + ((i * 7) % 360), (i % 50) + 1),
    );
    const started = performance.now();
    const index = buildClusterIndex(many);
    const clusters = index.getClusters(WORLD_BBOX, 3);
    const elapsed = performance.now() - started;

    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters.length).toBeLessThan(many.length);
    expect(elapsed).toBeLessThan(1000);
  });
});
