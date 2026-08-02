import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementCardMedia from "./AchievementCardMedia";

vi.mock("@/lib/storage", () => ({
  storageUrl: (key?: string | null) => (key ? `https://cdn.test/${key}` : undefined),
}));

const base = { id: "ach-1", title: "IEEE Paper Published" };

describe("AchievementCardMedia", () => {
  it("always renders a band, so cards in a row keep the same height", () => {
    const { container } = render(<AchievementCardMedia item={base} />);
    // Previously the media block was skipped entirely without an image, which
    // left short and tall cards side by side.
    expect(container.firstElementChild).not.toBeNull();
    expect(container.firstElementChild!.className).toContain("aspect-");
  });

  it("uses the uploaded image when there is one", () => {
    const { container } = render(
      <AchievementCardMedia item={{ ...base, imageKey: "achievement/a.png" }} />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://cdn.test/achievement/a.png");
    expect(img?.className).toContain("object-cover");
  });

  it("draws a fallback rather than an image when none was uploaded", () => {
    const { container } = render(<AchievementCardMedia item={base} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows the category on the band", () => {
    render(<AchievementCardMedia item={{ ...base, category: "Publication" }} />);
    expect(screen.getByText("Publication")).toBeInTheDocument();
  });

  it("gives different categories different colours", () => {
    const gradientOf = (category?: string) =>
      /from-\[#[0-9a-f]{6}\]/.exec(
        render(<AchievementCardMedia item={{ ...base, category }} />).container.innerHTML,
      )?.[0];

    expect(gradientOf("Publication")).not.toBe(gradientOf("Sports"));
    expect(gradientOf("Promotion")).not.toBe(gradientOf("Award"));
  });

  it("matches the category loosely, so free-text entries still theme", () => {
    const gradientOf = (category?: string) =>
      /from-\[#[0-9a-f]{6}\]/.exec(
        render(<AchievementCardMedia item={{ ...base, category }} />).container.innerHTML,
      )?.[0];

    // Authors type whatever they like into the category box.
    expect(gradientOf("Research Publication")).toBe(gradientOf("publication"));
    expect(gradientOf("National Sports Championship")).toBe(gradientOf("Sports"));
  });

  it("falls back to a default look for an unknown category", () => {
    const { container } = render(
      <AchievementCardMedia item={{ ...base, category: "Something Unusual" }} />,
    );
    expect(container.innerHTML).toContain("from-[#192841]");
  });
});
