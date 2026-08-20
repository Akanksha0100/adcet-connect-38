/**
 * The donor honour roll is generated, not curated: whatever the API returns is
 * what the landing page shows, in that order. These tests pin the parts a
 * redesign could quietly break — the live ordering, the photo-or-initials
 * fallback, the rupee shorthand, and the section vanishing entirely when
 * nobody has given yet.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { formatAmount } from "@/lib/donors";

const DONORS = [
  { id: "u1", name: "Rahul Desai", amount: 2500000, avatarKey: "avatar/rahul.png", graduationYear: 2011 },
  { id: "u2", name: "Alice Patil", amount: 145000, avatarKey: null, graduationYear: 2020 },
  { id: "u3", name: "Priya Sharma", amount: 60000, avatarKey: null, graduationYear: null },
];

const apiGet = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => apiGet(...a), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const TopDonorsStrip = (await import("./TopDonorsStrip")).default;

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockResolvedValue({ items: DONORS });
});

const renderStrip = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TopDonorsStrip />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("formatAmount", () => {
  it("uses the office's lakh/crore shorthand above five figures", () => {
    expect(formatAmount(60000)).toBe("₹60,000");
    expect(formatAmount(145000)).toBe("₹1.5 L");
    expect(formatAmount(2500000)).toBe("₹25 L");
    expect(formatAmount(12500000)).toBe("₹1.3 Cr");
  });
});

describe("TopDonorsStrip", () => {
  it("asks the public endpoint for a dozen donors", async () => {
    renderStrip();
    await screen.findAllByText("Rahul Desai");

    expect(apiGet).toHaveBeenCalledWith("/donations/public/top-donors", { limit: 12 });
  });

  it("ranks them in the order the API returned, largest first", async () => {
    const { container } = renderStrip();
    await screen.findAllByText("Rahul Desai");

    // The row is rendered twice for the seamless loop; the first copy is the
    // real one and carries the ranks.
    const names = [...container.querySelectorAll("figcaption > p:first-child")]
      .slice(0, DONORS.length)
      .map((p) => p.textContent);
    expect(names).toEqual(["Rahul Desai", "Alice Patil", "Priya Sharma"]);
    expect(screen.getAllByText("1")[0]).toBeInTheDocument();
  });

  it("shows a photo when there is one and initials when there isn't", async () => {
    renderStrip();
    const photos = await screen.findAllByRole("img", { name: "Rahul Desai" });

    expect(photos[0]).toHaveAttribute("src", expect.stringContaining("avatar/rahul.png"));
    // Alice has no avatarKey — her card falls back to initials, not a broken img.
    expect(screen.queryByRole("img", { name: "Alice Patil" })).not.toBeInTheDocument();
    expect(screen.getAllByText("AP")[0]).toBeInTheDocument();
  });

  it("shows the batch only for donors whose year is known", async () => {
    renderStrip();
    await screen.findAllByText("Alice Patil");

    expect(screen.getAllByText("Batch of 2020")[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Batch of/)).toHaveLength(4); // 2 donors × 2 copies
  });

  it("renders nothing at all until there is somebody to honour", async () => {
    apiGet.mockResolvedValue({ items: [] });
    const { container } = renderStrip();

    await vi.waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
    expect(screen.queryByText(/Our Generous Donors/)).not.toBeInTheDocument();
  });

  it("says anonymous gifts are excluded, so the roll can't read as a full ledger", async () => {
    renderStrip();
    await screen.findAllByText("Rahul Desai");

    expect(screen.getByText(/Gifts made anonymously are not shown/)).toBeInTheDocument();
  });
});
