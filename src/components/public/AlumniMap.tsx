import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { CAMPUS, CityCoord } from "@/lib/city-coords";

export interface MappedCity extends CityCoord {
  city: string;
  count: number;
}

interface Props {
  cities: MappedCity[];
  /** Change this to pan/zoom the map to a location; `nonce` allows re-focusing the same city. */
  focus?: { lat: number; lng: number; nonce: number } | null;
  className?: string;
}

/** Pin size grows with headcount, but stays within a readable range. */
const pinSize = (count: number) => Math.min(64, Math.max(34, 30 + Math.log2(count + 1) * 6));

const cityIcon = (count: number) => {
  const size = pinSize(count);
  return L.divIcon({
    className: "",
    html: `<div class="adcet-pin" style="width:${size}px;height:${size}px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const campusIcon = L.divIcon({
  className: "",
  html: `<div class="adcet-pin adcet-pin--campus" style="width:42px;height:42px">★</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export default function AlumniMap({ cities, focus, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  // Create the map once; tear it down on unmount so StrictMode's double-mount
  // in development doesn't hit "map container is already initialized".
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [21.5, 78.9],
      zoom: 4,
      minZoom: 2,
      worldCopyJump: true,
      // Page scroll wins until the visitor clicks into the map.
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    L.marker([CAMPUS.lat, CAMPUS.lng], { icon: campusIcon, zIndexOffset: 1000 })
      .bindPopup(`<strong>${CAMPUS.name}</strong><br/>Where it all began`)
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // Rebuild the cluster layer whenever the city data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clusterRef.current?.remove();

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      // Clusters display the sum of alumni, not the number of pins inside them.
      iconCreateFunction: (c) => {
        const total = c
          .getAllChildMarkers()
          .reduce((sum, m) => sum + ((m.options as { alumniCount?: number }).alumniCount ?? 0), 0);
        const size = pinSize(total) + 8;
        return L.divIcon({
          className: "",
          html: `<div class="adcet-pin adcet-pin--cluster" style="width:${size}px;height:${size}px">${total}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    for (const c of cities) {
      const marker = L.marker([c.lat, c.lng], {
        icon: cityIcon(c.count),
        alumniCount: c.count,
      } as L.MarkerOptions & { alumniCount: number });
      marker.bindPopup(
        `<strong>${c.city}</strong><br/>${c.region}<br/>${c.count.toLocaleString()} alumni`,
      );
      cluster.addLayer(marker);
    }

    cluster.addTo(map);
    clusterRef.current = cluster;

    if (cities.length > 0) {
      map.fitBounds(L.latLngBounds(cities.map((c) => [c.lat, c.lng] as [number, number])), {
        padding: [48, 48],
        maxZoom: 6,
      });
    }
  }, [cities]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo([focus.lat, focus.lng], 9, { duration: 0.9 });
  }, [focus]);

  return <div ref={containerRef} className={`w-full rounded-xl overflow-hidden ${className}`} />;
}
