/**
 * The Alumni Collaboration sidebar entry is a group, not a link, and the same
 * component serves both the member and the admin sidebar. What must hold: it
 * lists every kind, it is already open when you arrive on one of its pages, and
 * it links to the *portal* routes on the member side and the admin routes on
 * the admin side — pointing a member's link at /admin would send them to a
 * page they cannot open.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Handshake } from "lucide-react";
import SidebarNavGroup from "./SidebarNavGroup";
import { COLLABORATION_KIND_LIST } from "@/lib/collaboration";

const items = COLLABORATION_KIND_LIST.map((k) => ({
  label: k.label,
  path: `/dashboard/collaboration/${k.slug}`,
}));

const renderGroup = (route = "/dashboard", extra: Partial<{ badge: string }> = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <SidebarNavGroup
        label="Alumni Collaboration"
        icon={Handshake}
        basePath="/dashboard/collaboration"
        items={items.map((i, idx) => (idx === 0 ? { ...i, ...extra } : i))}
      />
    </MemoryRouter>,
  );

describe("SidebarNavGroup", () => {
  it("starts collapsed elsewhere and opens on click", () => {
    renderGroup();
    expect(screen.queryByRole("link", { name: "Placement" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Alumni Collaboration/ }));
    expect(screen.getByRole("link", { name: "Placement" })).toBeInTheDocument();
  });

  it("is already open when the current route is inside it", () => {
    renderGroup("/dashboard/collaboration/workshop");
    expect(screen.getByRole("button", { name: /Alumni Collaboration/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Workshop" })).toBeInTheDocument();
  });

  it("links to every collaboration kind, in order", () => {
    renderGroup("/dashboard/collaboration/placement");
    const hrefs = COLLABORATION_KIND_LIST.map((k) =>
      screen.getByRole("link", { name: k.label }).getAttribute("href"),
    );
    expect(hrefs).toEqual(["/dashboard/collaboration/placement", "/dashboard/collaboration/workshop"]);
  });

  it("rolls child badges up to the heading while collapsed, so a pending request is not hidden", () => {
    renderGroup("/dashboard", { badge: "4" });
    const heading = screen.getByRole("button", { name: /Alumni Collaboration/ });
    expect(heading).toHaveTextContent("4");

    fireEvent.click(heading);
    // Once open the count belongs on the kind it applies to, not the heading.
    expect(screen.getByRole("link", { name: /Placement/ })).toHaveTextContent("4");
  });
});
