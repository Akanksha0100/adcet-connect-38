import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { compactCount, placeLabel, pluralAlumni, AlumniMapData } from "@/lib/geo";

const MAP_DATA: AlumniMapData = {
  points: [
    { id: "p1", city: "Pune", state: "Maharashtra", country: "India", lat: 18.52, lng: 73.857, count: 287 },
    { id: "p2", city: "London", state: null, country: "United Kingdom", lat: 51.507, lng: -0.128, count: 12 },
  ],
  countries: [
    { country: "India", count: 287 },
    { country: "United Kingdom", count: 12 },
  ],
  totals: { alumni: 320, placed: 299, unplaced: 21, cities: 2, countries: 2 },
  campus: { name: "ADCET, Ashta", state: "Maharashtra", country: "India", lat: 16.949, lng: 74.409 },
  generatedAt: "2026-08-11T00:00:00.000Z",
};

const apiGet = vi.fn().mockResolvedValue(MAP_DATA);
vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => apiGet(...args), patch: vi.fn().mockResolvedValue({}) },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

// Leaflet needs real layout and canvas APIs that jsdom doesn't provide; the map
// itself is exercised in the browser, so the page test stubs it out and checks
// that the right points are handed to it.
const mapProps = vi.fn();
vi.mock("@/components/public/AlumniMap", () => ({
  default: (props: Record<string, unknown>) => {
    mapProps(props);
    return <div data-testid="alumni-map" />;
  },
}));

const AlumniMapPage = (await import("./AlumniMapPage")).default;

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AlumniMapPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("geo helpers", () => {
  it("abbreviates big headcounts so a marker badge stays legible", () => {
    expect(compactCount(42)).toBe("42");
    expect(compactCount(999)).toBe("999");
    expect(compactCount(1200)).toBe("1.2k");
    expect(compactCount(1000)).toBe("1k");
    expect(compactCount(50_000)).toBe("50k");
  });

  it("builds a place label, skipping a missing state", () => {
    expect(placeLabel(MAP_DATA.points[0])).toBe("Pune, Maharashtra, India");
    expect(placeLabel(MAP_DATA.points[1])).toBe("London, United Kingdom");
  });

  it("pluralises the headcount", () => {
    expect(pluralAlumni(1)).toBe("1 alumnus");
    expect(pluralAlumni(287)).toBe("287 alumni");
    expect(pluralAlumni(50_000)).toBe("50,000 alumni");
  });
});

describe("AlumniMapPage", () => {
  it("reads the public map endpoint without a session", async () => {
    renderPage();
    await screen.findByTestId("alumni-map");

    expect(apiGet).toHaveBeenCalledWith("/geo/public/map", undefined, { anonymous: true });
  });

  it("hands the aggregated city points and the campus to the map", async () => {
    renderPage();
    await screen.findByTestId("alumni-map");

    expect(mapProps).toHaveBeenCalledWith(
      expect.objectContaining({ points: MAP_DATA.points, campus: MAP_DATA.campus }),
    );
  });

  it("is the map and nothing else — no stat tiles, city index or country roll-up", async () => {
    renderPage();
    await screen.findByTestId("alumni-map");

    // The counts belong on the markers; the page must not restate them.
    for (const metric of ["299", "287", "Alumni on the map", "Cities", "Countries", "Pune"]) {
      expect(screen.queryByText(metric)).not.toBeInTheDocument();
    }
    // The city-index search went with the index. (A textbox still exists —
    // the shared public layout has one — so match the removed field itself.)
    expect(screen.queryByLabelText("Find a city or country")).not.toBeInTheDocument();
  });
});
