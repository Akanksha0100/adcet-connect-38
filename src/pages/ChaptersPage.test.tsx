import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FALLBACK_CHAPTERS, chapterImage } from "@/lib/chapters";

const CHAPTERS = [
  { id: "c-pune", slug: "pune", name: "Pune Chapter", city: "Pune", blurb: "Pune blurb", accent: null, isActive: true, memberCount: 12 },
  { id: "c-mumbai", slug: "mumbai", name: "Mumbai Chapter", city: "Mumbai", blurb: "Mumbai blurb", accent: null, isActive: true, memberCount: 8 },
  { id: "c-blr", slug: "bangalore", name: "Bangalore Chapter", city: "Bangalore", blurb: "Blr blurb", accent: null, isActive: true, memberCount: 5 },
  { id: "c-global", slug: "global", name: "Global Chapter", city: null, blurb: "Global blurb", accent: null, isActive: true, memberCount: 3 },
];

const MEMBERS = [
  {
    userId: "u1",
    department: "Computer Science and Engineering",
    graduationYear: 2020,
    city: "Pune",
    currentCompany: "Infosys",
    currentRole: "SDE-2",
    // No email — the API withholds it from non-admins.
    user: { firstName: "Alice", lastName: "Patil" },
  },
];

const apiGet = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => apiGet(...a), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const ChaptersPage = (await import("./ChaptersPage")).default;

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockImplementation((path: string) => {
    if (path === "/chapters") return Promise.resolve({ items: CHAPTERS });
    if (path.endsWith("/members")) return Promise.resolve({ items: MEMBERS });
    return Promise.resolve({ items: [] });
  });
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ChaptersPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("chapter images", () => {
  it("resolves Global by slug, since it has no city", () => {
    expect(chapterImage({ slug: "global", city: null })).toBe("/Chapters/Global.png");
  });

  it("keeps the offline fallback list in the office's order", () => {
    // The API sorts by `sortOrder`; the fallback the public page uses when the
    // API is unreachable has to agree, or the order would change on error.
    expect(FALLBACK_CHAPTERS.map((c) => c.slug)).toEqual(["pune", "mumbai", "bangalore", "global"]);
  });
});

describe("ChaptersPage", () => {
  it("lists chapters in the order the API returned them", async () => {
    renderPage();
    await screen.findByText("Pune Chapter");

    const names = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual(["Pune Chapter", "Mumbai Chapter", "Bangalore Chapter", "Global Chapter"]);
  });

  it("opens a chapter's members when its card is clicked", async () => {
    renderPage();
    await screen.findByText("Pune Chapter");

    fireEvent.click(screen.getByRole("button", { name: /Pune Chapter/ }));

    await waitFor(() => expect(screen.getByText("Alice Patil")).toBeInTheDocument());
    expect(apiGet).toHaveBeenCalledWith("/chapters/c-pune/members", { pageSize: 100 });
    expect(screen.getByText(/SDE-2, Infosys/)).toBeInTheDocument();
  });

  it("is read-only — no join, invite, edit or remove controls", async () => {
    renderPage();
    await screen.findByText("Pune Chapter");

    for (const label of [/join/i, /invite/i, /create chapter/i, /edit/i, /delete/i, /remove/i, /archive/i]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });

  it("does not ask for archived chapters", async () => {
    renderPage();
    await screen.findByText("Pune Chapter");

    // Archived chapters are an admin concern; the member list never requests them.
    expect(apiGet).toHaveBeenCalledWith("/chapters", undefined);
  });
});
