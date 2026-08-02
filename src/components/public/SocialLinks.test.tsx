import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SocialLinks from "./SocialLinks";
import { SOCIAL_LINKS } from "@/lib/site";

describe("SOCIAL_LINKS", () => {
  it("points every account at a real absolute URL", () => {
    for (const s of SOCIAL_LINKS) {
      expect(s.href, `${s.name} is still a placeholder`).not.toBe("#");
      // A protocol-less href resolves relative to the current route, so
      // "www.youtube.com/@X" would navigate to /dashboard/www.youtube.com/@X.
      expect(s.href, `${s.name} needs an https:// prefix`).toMatch(/^https:\/\//);
    }
  });

  it("carries no tracking parameters", () => {
    for (const s of SOCIAL_LINKS) {
      // The Instagram URL was supplied from a QR nametag and arrived with
      // ?utm_source=qr&r=nametag, which would misattribute web visitors.
      expect(s.href, `${s.name} still has a query string`).not.toContain("?");
      expect(s.href).not.toContain("utm_");
    }
  });

  it("lists the four accounts the alumni cell runs", () => {
    expect(SOCIAL_LINKS.map((s) => s.name)).toEqual([
      "Instagram",
      "X (Twitter)",
      "LinkedIn",
      "YouTube",
    ]);
  });

  it("has an icon registered for each account", () => {
    const { container } = render(<SocialLinks />);
    expect(container.querySelectorAll("svg")).toHaveLength(SOCIAL_LINKS.length);
  });
});

describe("SocialLinks", () => {
  it("renders one labelled link per account", () => {
    render(<SocialLinks />);
    for (const s of SOCIAL_LINKS) {
      const link = screen.getByRole("link", { name: s.name });
      expect(link).toHaveAttribute("href", s.href);
    }
  });

  it("opens external profiles in a new tab, safely", () => {
    render(<SocialLinks />);
    for (const s of SOCIAL_LINKS) {
      const link = screen.getByRole("link", { name: s.name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });
});
