import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import LandingPage from "./LandingPage";
import AboutPage from "./AboutPage";
import ContactPage from "./ContactPage";
import NewsPage from "./NewsPage";
import GalleryPage from "./GalleryPage";
import EsteemedAlumniPage from "./EsteemedAlumniPage";
import { TOTAL_ALUMNI } from "@/lib/alumni-count";
import { BOARD_MEMBERS } from "@/lib/board";
import { CONTACT } from "@/lib/site";

// The landing page pulls featured achievements; keep the smoke test offline.
vi.mock("@/lib/api", () => ({
  api: { get: vi.fn().mockResolvedValue({ items: [] }), patch: vi.fn().mockResolvedValue({}) },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const renderPage = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("public pages", () => {
  it("renders the landing page with the alumni figures", () => {
    renderPage(<LandingPage />);
    expect(screen.getByRole("heading", { name: "ADCET Alumni Portal" })).toBeInTheDocument();
    // Matched loosely so copy tweaks like "11,256+" don't break the smoke test.
    expect(screen.getByText(/11,256/)).toBeInTheDocument();
    expect(screen.getByText(/^26\+?$/)).toBeInTheDocument();
  });

  it("renders every board member and the alumni total on the about page", () => {
    renderPage(<AboutPage />);
    expect(screen.getByRole("heading", { name: "Alumni Association Board" })).toBeInTheDocument();
    for (const m of BOARD_MEMBERS) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    }
    // The footer total is derived from the rows, not hardcoded.
    expect(TOTAL_ALUMNI).toBe(11256);
    expect(screen.getAllByText("11,256").length).toBeGreaterThan(0);
  });

  it("shows the alumni office contact details and not the director's mail", () => {
    renderPage(<ContactPage />);
    expect(screen.getAllByText("alumni@adcet.in").length).toBeGreaterThan(0);
    // Derived from CONTACT rather than hardcoded — the office adds and drops
    // numbers, and that shouldn't fail a test about *which* address is shown.
    // Each number appears in both the page body and the shared footer.
    expect(CONTACT.phones.length).toBeGreaterThan(0);
    for (const phone of CONTACT.phones) {
      expect(screen.getAllByRole("link", { name: phone }).length).toBeGreaterThan(0);
    }
    // The director's address belongs in the footer only, not in page content.
    expect(screen.queryByText(/General Enquiry/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("director@adcet.in")).toHaveLength(1);
  });

  it("renders the news, gallery and esteemed alumni pages", () => {
    renderPage(<NewsPage />);
    expect(screen.getByRole("heading", { name: "Latest Updates" })).toBeInTheDocument();

    renderPage(<GalleryPage />);
    expect(screen.getAllByRole("heading", { name: "Gallery" }).length).toBeGreaterThan(0);

    renderPage(<EsteemedAlumniPage />);
    expect(screen.getByRole("heading", { name: "All Esteemed Alumni" })).toBeInTheDocument();
  });
});
