import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AlumniNetworkMessage from "./AlumniNetworkMessage";
import LeadershipRow from "./LeadershipRow";
import { ALUMNI_NETWORK_MESSAGE, LEADERSHIP } from "@/lib/public-content";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn().mockResolvedValue({ items: [] }), patch: vi.fn().mockResolvedValue({}) },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const LandingPage = (await import("@/pages/LandingPage")).default;

const renderIn = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("LeadershipRow", () => {
  it("shows the Secretary first and the Joint Secretary second", () => {
    const { container } = renderIn(<LeadershipRow />);
    const figures = container.querySelectorAll("figure");

    expect(figures).toHaveLength(2);
    expect(within(figures[0] as HTMLElement).getByText("Adv. Rajendra R. Dange")).toBeInTheDocument();
    expect(within(figures[0] as HTMLElement).getByText("Secretary,")).toBeInTheDocument();
    expect(within(figures[1] as HTMLElement).getByText("Hon. Vishwanath R. Dange")).toBeInTheDocument();
    expect(within(figures[1] as HTMLElement).getByText("Joint Secretary,")).toBeInTheDocument();
  });

  it("renders each portrait and message", () => {
    renderIn(<LeadershipRow />);
    for (const p of LEADERSHIP) {
      expect(screen.getByRole("img", { name: p.name })).toHaveAttribute("src", p.photo);
      expect(screen.getByText(`"${p.quote}"`)).toBeInTheDocument();
      expect(screen.getByText(p.org)).toBeInTheDocument();
    }
  });
});

describe("AlumniNetworkMessage", () => {
  const [intro, ...rest] = ALUMNI_NETWORK_MESSAGE.paragraphs;

  it("starts collapsed: one clamped paragraph behind Read more", () => {
    renderIn(<AlumniNetworkMessage />);

    expect(screen.getByText(intro)).toHaveClass("line-clamp-6");
    for (const p of rest) expect(screen.queryByText(p)).not.toBeInTheDocument();
    expect(screen.queryByText(ALUMNI_NETWORK_MESSAGE.closing)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read more/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("reveals the rest on Read more, and collapses again", () => {
    renderIn(<AlumniNetworkMessage />);

    fireEvent.click(screen.getByRole("button", { name: /read more/i }));
    for (const p of rest) expect(screen.getByText(p)).toBeInTheDocument();
    expect(screen.getByText(ALUMNI_NETWORK_MESSAGE.closing)).toBeInTheDocument();
    expect(screen.getByText(intro)).not.toHaveClass("line-clamp-6");

    fireEvent.click(screen.getByRole("button", { name: /read less/i }));
    expect(screen.queryByText(rest[0])).not.toBeInTheDocument();
  });
});

describe("landing page order", () => {
  it("runs founder → secretaries → director → welcome", () => {
    const { container } = renderIn(<LandingPage />);
    const text = container.textContent ?? "";

    const at = (needle: string) => {
      const i = text.indexOf(needle);
      expect(i, `expected to find "${needle}" on the landing page`).toBeGreaterThan(-1);
      return i;
    };

    const founder = at("Dream boldly");
    const secretary = at("Adv. Rajendra R. Dange");
    const jointSecretary = at("Hon. Vishwanath R. Dange");
    const director = at("From the Director's Desk");
    const welcome = at(ALUMNI_NETWORK_MESSAGE.title);

    expect(founder).toBeLessThan(secretary);
    expect(secretary).toBeLessThan(jointSecretary);
    expect(jointSecretary).toBeLessThan(director);
    expect(director).toBeLessThan(welcome);
  });
});
