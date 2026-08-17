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

const INVITATION = {
  id: "inv-1",
  chapterId: "c-blr",
  userId: "u9",
  status: "PENDING" as const,
  message: "We'd love to have you at the next Bengaluru meetup.",
  createdAt: "2026-08-17T09:59:13.427Z",
  respondedAt: null,
  chapter: { id: "c-blr", slug: "bangalore", name: "Bangalore Chapter", city: "Bangalore", blurb: null, accent: null, isActive: true },
  invitedBy: { firstName: "Asha", lastName: "Rao" },
};

const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock("@/lib/api", () => ({
  api: {
    get: (...a: unknown[]) => apiGet(...a),
    post: (...a: unknown[]) => apiPost(...a),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const ChaptersPage = (await import("./ChaptersPage")).default;

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiPost.mockResolvedValue({ ...INVITATION, status: "ACCEPTED" });
  apiGet.mockImplementation((path: string) => {
    if (path === "/chapters") return Promise.resolve({ items: CHAPTERS });
    if (path === "/chapters/invitations/me") return Promise.resolve({ items: [] });
    if (path.endsWith("/members")) return Promise.resolve({ items: MEMBERS });
    return Promise.resolve({ items: [] });
  });
});

/** Make the one pending invitation visible for a test that needs it. */
const withInvitation = () =>
  apiGet.mockImplementation((path: string) => {
    if (path === "/chapters") return Promise.resolve({ items: CHAPTERS });
    if (path === "/chapters/invitations/me") return Promise.resolve({ items: [INVITATION] });
    if (path.endsWith("/members")) return Promise.resolve({ items: MEMBERS });
    return Promise.resolve({ items: [] });
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

  it("shows no invitation panel when the office hasn't invited you", async () => {
    renderPage();
    await screen.findByText("Pune Chapter");

    expect(apiGet).toHaveBeenCalledWith("/chapters/invitations/me");
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
  });

  it("lets you accept an invitation addressed to you", async () => {
    withInvitation();
    renderPage();

    await screen.findByText(/You're invited to the Bangalore Chapter/);
    expect(screen.getByText(/Invited by Asha Rao/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/chapters/invitations/inv-1/respond", { response: "ACCEPT" }),
    );
  });

  it("declines through the same endpoint", async () => {
    withInvitation();
    renderPage();
    await screen.findByText(/You're invited to the Bangalore Chapter/);

    fireEvent.click(screen.getByRole("button", { name: /decline/i }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/chapters/invitations/inv-1/respond", { response: "DECLINE" }),
    );
  });

  it("says a roster failed to load instead of showing it as empty", async () => {
    apiGet.mockImplementation((path: string) => {
      if (path === "/chapters") return Promise.resolve({ items: CHAPTERS });
      if (path === "/chapters/invitations/me") return Promise.resolve({ items: [] });
      if (path.endsWith("/members")) return Promise.reject(new Error("Account pending approval"));
      return Promise.resolve({ items: [] });
    });
    renderPage();
    await screen.findByText("Pune Chapter");

    fireEvent.click(screen.getByRole("button", { name: /Pune Chapter/ }));

    await screen.findByText("Couldn't load this roster");
    expect(screen.getByText("Account pending approval")).toBeInTheDocument();
    // The failure must not be indistinguishable from a chapter with no members.
    expect(screen.queryByText("No members yet")).not.toBeInTheDocument();
  });

  it("does not ask for archived chapters", async () => {
    renderPage();
    await screen.findByText("Pune Chapter");

    // Archived chapters are an admin concern; the member list never requests them.
    expect(apiGet).toHaveBeenCalledWith("/chapters", undefined);
  });
});
