import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EventCardMedia from "./EventCardMedia";

vi.mock("@/lib/storage", () => ({
  storageUrl: (key?: string | null) => (key ? `https://cdn.test/${key}` : undefined),
}));

const base = {
  id: "evt-1",
  title: "Annual Alumni Meet",
  startsAt: "2026-09-14T10:30:00.000Z",
};

describe("EventCardMedia", () => {
  it("draws a banner instead of loading the shared poster when there is no cover", () => {
    const { container } = render(<EventCardMedia event={base} />);
    // The old design cropped a 1200x500 artwork with baked-in lettering into a
    // thin strip; nothing should reference that asset any more.
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("event-card-banner");
  });

  it("leads with the event date so cards are scannable", () => {
    render(<EventCardMedia event={base} />);
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
  });

  it("keeps every month three letters so the chip doesn't jump width", () => {
    // en-IN renders September as "Sept", which is wider than every other month.
    render(<EventCardMedia event={base} />);
    expect(screen.getByText("Sep")).toBeInTheDocument();
    expect(screen.queryByText("Sept")).not.toBeInTheDocument();
  });

  it("shows the event's own cover image when it has one", () => {
    const { container } = render(<EventCardMedia event={{ ...base, coverKey: "events/a.jpg" }} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("https://cdn.test/events/a.jpg");
    // Cover must fill the band rather than letterbox or stretch.
    expect(img!.className).toContain("object-cover");
  });

  it("marks online events on the banner", () => {
    render(<EventCardMedia event={{ ...base, isOnline: true }} />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("gives the same event the same colours every render", () => {
    const a = render(<EventCardMedia event={base} />).container.innerHTML;
    const b = render(<EventCardMedia event={base} />).container.innerHTML;
    expect(a).toBe(b);
  });

  it("varies the gradient across events so a list doesn't look uniform", () => {
    const gradientOf = (id: string) => {
      const { container } = render(<EventCardMedia event={{ ...base, id }} />);
      return /from-\[#[0-9a-f]{6}\]/.exec(container.innerHTML)?.[0];
    };
    const seen = new Set(["a", "b", "c", "d", "e", "f"].map(gradientOf));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("degrades gracefully on an unparseable date", () => {
    render(<EventCardMedia event={{ ...base, startsAt: "not-a-date" }} />);
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });
});
