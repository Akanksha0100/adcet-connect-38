/**
 * A single achievement is read in two places, and the difference between them
 * is the point of these tests: inside the portal it is a bare content block
 * that `DashboardLayout` wraps (no header, no sign-up CTA, Back stays in the
 * portal), while `/achievements/:id` is the shareable public page that keeps
 * its own header and CTA. Getting these two crossed is what made an in-portal
 * click look like it had left the application.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";

const ACHIEVEMENT = {
  id: "a1",
  title: "National Innovation Award 2026",
  description: "Recognised for a low-cost water purification unit.",
  category: "Award",
  occurredOn: "2026-03-04T00:00:00.000Z",
  imageKey: null,
  attachmentKey: null,
  link: null,
  status: "APPROVED" as const,
  user: { firstName: "Alice", lastName: "Patil" },
};

const apiGet = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => apiGet(...a), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const AchievementDetailPage = (await import("./AchievementDetailPage")).default;
const PublicAchievementPage = (await import("./PublicAchievementPage")).default;
const AchievementsPage = (await import("./AchievementsPage")).default;

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockImplementation((path: string) => {
    if (path === "/achievements") return Promise.resolve({ items: [ACHIEVEMENT] });
    if (path.startsWith("/achievements/")) return Promise.resolve(ACHIEVEMENT);
    return Promise.resolve({ items: [] });
  });
});

const renderAt = (ui: React.ReactElement, path = "/dashboard/achievements/a1") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/dashboard/achievements" element={<div>Achievements list</div>} />
            <Route path="/dashboard/achievements/:id" element={ui} />
            <Route path="/achievements/:id" element={ui} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("AchievementDetailPage (in the portal)", () => {
  it("reads the authenticated endpoint, so an author's pending item still opens", async () => {
    renderAt(<AchievementDetailPage />);
    await screen.findByText(ACHIEVEMENT.title);

    // Not /achievements/public/:id — that one returns published items only.
    expect(apiGet).toHaveBeenCalledWith("/achievements/a1");
  });

  it("brings no chrome of its own — the dashboard layout supplies it", async () => {
    renderAt(<AchievementDetailPage />);
    await screen.findByText(ACHIEVEMENT.title);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /join network/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Are you an ADCET alumnus/i)).not.toBeInTheDocument();
  });

  it("keeps Back inside the portal when there is no history to go back to", async () => {
    renderAt(<AchievementDetailPage />);
    await screen.findByText(ACHIEVEMENT.title);

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    // Opened cold (a deep link or a reload): fall back to the list, never "/".
    expect(await screen.findByText("Achievements list")).toBeInTheDocument();
  });

  it("shows the moderation state on an author's own pending submission", async () => {
    apiGet.mockResolvedValue({ ...ACHIEVEMENT, status: "PENDING" });
    renderAt(<AchievementDetailPage />);

    expect(await screen.findByText("Pending review")).toBeInTheDocument();
  });
});

describe("PublicAchievementPage (the shared link)", () => {
  it("keeps its own header and sign-up CTA, and reads the public endpoint", async () => {
    renderAt(<PublicAchievementPage />, "/achievements/a1");
    await screen.findByText(ACHIEVEMENT.title);

    expect(apiGet).toHaveBeenCalledWith("/achievements/public/a1");
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /join the alumni network/i })).toHaveAttribute("href", "/register");
  });
});

describe("the achievements list", () => {
  it("links its cards into the portal, not out to the public page", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AchievementsPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const link = await screen.findByRole("link", { name: ACHIEVEMENT.title });
    expect(link).toHaveAttribute("href", "/dashboard/achievements/a1");
  });
});
