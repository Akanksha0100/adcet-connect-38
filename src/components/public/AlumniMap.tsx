import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type Supercluster from "supercluster";
import { useTheme } from "@/contexts/ThemeContext";
import {
  MapPoint,
  AlumniMapData,
  LeafProps,
  ClusterProps,
  buildClusterIndex,
  isCluster,
  compactCount,
  placeLabel,
  pluralAlumni,
} from "@/lib/geo";

/**
 * The alumni directory map.
 *
 * Clustering is done by **supercluster** (see `buildClusterIndex`), not by
 * dropping one marker per record and hoping. Two properties matter at scale:
 * the backend already aggregates alumni into one point per city, so the browser
 * receives hundreds of points rather than tens of thousands; and supercluster
 * answers `getClusters(bbox, zoom)` from a per-zoom KD-tree, so panning and
 * zooming cost only what is on screen.
 *
 * This file is the rendering half: it turns those clusters into themed markers,
 * redraws them on every move, and zooms into a cluster when it is clicked.
 */

interface Props {
  points: MapPoint[];
  campus?: AlumniMapData["campus"];
  className?: string;
}

/** Badge diameter grows with headcount but stays inside a legible range. */
const badgeSize = (count: number) => Math.round(Math.min(78, 34 + Math.sqrt(count) * 2.4));

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" }[c]};`);

/**
 * CARTO's label-light basemaps. Chosen over the default OSM raster so the map
 * reads as a data surface with our markers on top rather than as a street map,
 * and so it can follow the portal into dark mode.
 */
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function AlumniMap({ points, campus, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const indexRef = useRef<Supercluster<LeafProps, ClusterProps> | null>(null);
  const { darkMode } = useTheme();

  /**
   * Draw the clusters for the current viewport. Called on every move/zoom and
   * whenever the data changes — it rebuilds only what is on screen.
   */
  const draw = useCallback(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const index = indexRef.current;
    if (!map || !layer || !index) return;

    const b = map.getBounds();
    const bbox: [number, number, number, number] = [
      Math.max(-180, b.getWest()),
      Math.max(-85, b.getSouth()),
      Math.min(180, b.getEast()),
      Math.min(85, b.getNorth()),
    ];
    const zoom = Math.round(map.getZoom());

    layer.clearLayers();

    for (const feature of index.getClusters(bbox, zoom)) {
      const [lng, lat] = feature.geometry.coordinates;
      if (isCluster(feature)) {
        const alumni = feature.properties.alumni;
        const size = badgeSize(alumni);
        const clusterId = feature.properties.cluster_id;

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="adcet-pin adcet-pin--cluster" style="width:${size}px;height:${size}px">${compactCount(alumni)}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          // Bigger groups sit above smaller ones where they overlap.
          zIndexOffset: Math.min(alumni, 500),
        });

        marker.bindTooltip(`${pluralAlumni(alumni)} — click to zoom in`, {
          direction: "top",
          offset: [0, -size / 2],
        });

        // Requirement: clicking a cluster zooms to the point where it splits.
        marker.on("click", () => {
          const target = Math.min(index.getClusterExpansionZoom(clusterId), map.getMaxZoom());
          map.flyTo([lat, lng], target, { duration: 0.6 });
        });

        layer.addLayer(marker);
        continue;
      }

      // A single city — the finest granularity the map ever shows.
      const leaf: LeafProps = feature.properties;
      const size = badgeSize(leaf.count);
      const label = placeLabel(leaf);
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="adcet-pin" style="width:${size}px;height:${size}px">${compactCount(leaf.count)}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        zIndexOffset: Math.min(leaf.count, 500),
      });
      marker.bindTooltip(`${escapeHtml(label)} — ${pluralAlumni(leaf.count)}`, {
        direction: "top",
        offset: [0, -size / 2],
      });
      marker.bindPopup(
        `<strong>${escapeHtml(leaf.city)}</strong><br/>${escapeHtml(
          [leaf.state, leaf.country].filter(Boolean).join(", "),
        )}<br/>${pluralAlumni(leaf.count)}`,
      );
      layer.addLayer(marker);
    }
  }, []);

  // Create the map once; tear it down on unmount so StrictMode's double-mount
  // in development doesn't hit "map container is already initialized".
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [21.5, 78.9],
      zoom: 4,
      minZoom: 2,
      maxZoom: 16,
      // One world, not an endless carousel of copies — clusters would appear to
      // duplicate across each repeat.
      worldCopyJump: false,
      maxBounds: L.latLngBounds([-85, -180], [85, 180]),
      maxBoundsViscosity: 0.8,
      // Page scroll wins until the visitor clicks into the map.
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("moveend", draw);
    map.on("zoomend", draw);

    // The container is often laid out after the map is built (tabs, skeleton
    // swap); without this the tiles render into a stale size on mobile.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.off("moveend", draw);
      map.off("zoomend", draw);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
    };
  }, [draw]);

  // Swap the basemap when the portal switches between light and dark.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    tileRef.current = L.tileLayer(darkMode ? TILES.dark : TILES.light, {
      attribution: TILE_ATTRIBUTION,
      subdomains: "abcd",
      maxZoom: 19,
      noWrap: true,
    }).addTo(map);
  }, [darkMode]);

  // Campus marker — the origin point, not an alumni location, so it is a plain
  // marker outside the cluster index and never counted into a badge.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !campus) return;
    const marker = L.marker([campus.lat, campus.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div class="adcet-pin adcet-pin--campus" style="width:42px;height:42px">★</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      }),
      zIndexOffset: 1000,
    })
      .bindTooltip(campus.name, { direction: "top", offset: [0, -21] })
      .bindPopup(`<strong>${escapeHtml(campus.name)}</strong><br/>Where it all began`)
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [campus]);

  // Rebuild the cluster index when the data changes, then fit the view to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    indexRef.current = buildClusterIndex(points);

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [56, 56],
        maxZoom: 6,
      });
    }
    draw();
  }, [points, draw]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map of where ADCET alumni live, grouped by region"
      className={`w-full ${className}`}
    />
  );
}
