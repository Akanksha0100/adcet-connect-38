/**
 * Alumni Collaboration, member side.
 *
 * Two things are worth pinning: one component serves every kind, so the form it
 * renders must actually change with `type` (a placement form asking for a
 * duration would be a silent regression), and the payload it builds must match
 * the API's discriminated union — the form holds everything as strings, and the
 * API rejects "25" where it wants 25.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { COLLABORATION_KIND_LIST, detailRowsOf } from "@/lib/collaboration";
import type { CollaborationRequest, CollaborationType } from "@/lib/collaboration";

const MY_PLACEMENT: CollaborationRequest = {
  id: "c-1",
  type: "PLACEMENT",
  status: "PENDING",
  title: "Infosys campus drive",
  organization: "Infosys",
  departments: ["Computer Science and Engineering"],
  mode: "ON_CAMPUS",
  candidatesRequired: 25,
  packageLpa: 6.5,
  driveDate: "2026-09-10T00:00:00.000Z",
  jobRole: "Systems Engineer",
  createdAt: "2026-08-18T09:00:00.000Z",
};

const REJECTED: CollaborationRequest = {
  ...MY_PLACEMENT,
  id: "c-2",
  status: "REJECTED",
  title: "Off-season drive",
  rejectionReason: "Dates clash with end-semester exams",
};

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDelete = vi.fn();
vi.mock("@/lib/api", () => ({
  api: {
    get: (...a: unknown[]) => apiGet(...a),
    post: (...a: unknown[]) => apiPost(...a),
    patch: vi.fn(),
    delete: (...a: unknown[]) => apiDelete(...a),
  },
  apiUrl: (p: string) => p,
  tokenStore: { get: () => null, set: vi.fn(), clear: vi.fn() },
}));

const CollaborationPage = (await import("./CollaborationPage")).default;

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiDelete.mockReset();
  apiGet.mockResolvedValue({ items: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 1 } });
  apiPost.mockResolvedValue({ id: "new" });
  apiDelete.mockResolvedValue(undefined);
});

const renderPage = (type: CollaborationType = "PLACEMENT") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CollaborationPage type={type} />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

const withRequests = (items: CollaborationRequest[]) =>
  apiGet.mockResolvedValue({
    items,
    pagination: { total: items.length, page: 1, pageSize: 50, totalPages: 1 },
  });

describe("collaboration kinds", () => {
  it("gives every kind a unique slug, so routes cannot collide", () => {
    const slugs = COLLABORATION_KIND_LIST.map((k) => k.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("drops blank rows so a half-filled request has no empty lines", () => {
    const rows = detailRowsOf({ ...MY_PLACEMENT, jobRole: null, organization: null });
    expect(rows.map((r) => r.label)).not.toContain("Role offered");
    expect(rows.map((r) => r.label)).not.toContain("Organisation");
    expect(rows).toContainEqual({ label: "Package", value: "6.5 LPA" });
  });

  it("reads an empty department list as open to everyone", () => {
    const rows = detailRowsOf({ ...MY_PLACEMENT, departments: [] });
    expect(rows).toContainEqual({ label: "Departments", value: "All departments" });
  });
});

describe("CollaborationPage", () => {
  it("asks a placement's questions, not a workshop's", async () => {
    renderPage("PLACEMENT");
    await screen.findByLabelText("Candidates required");
    expect(screen.getByLabelText("Package (LPA)")).toBeInTheDocument();
    expect(screen.getByLabelText("Preferred date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Subject")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("From date")).not.toBeInTheDocument();
  });

  it("asks a workshop's questions, not a placement's", async () => {
    renderPage("WORKSHOP");
    await screen.findByLabelText("Subject");
    expect(screen.getByLabelText("Duration")).toBeInTheDocument();
    expect(screen.getByLabelText("From date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Candidates required")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Package (LPA)")).not.toBeInTheDocument();
  });

  it("only ever asks for its own requests of its own kind", async () => {
    renderPage("WORKSHOP");
    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith("/collaboration", {
        type: "WORKSHOP",
        mine: true,
        pageSize: 50,
      }),
    );
  });

  it("posts numbers as numbers, not as the strings the inputs hold", async () => {
    renderPage("PLACEMENT");
    await screen.findByLabelText("Candidates required");

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Infosys campus drive" },
    });
    fireEvent.change(screen.getByLabelText("Candidates required"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Package (LPA)"), { target: { value: "6.5" } });
    fireEvent.change(screen.getByLabelText("Preferred date"), { target: { value: "2026-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit request/ }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    expect(apiPost).toHaveBeenCalledWith(
      "/collaboration",
      expect.objectContaining({
        type: "PLACEMENT",
        title: "Infosys campus drive",
        candidatesRequired: 25,
        packageLpa: 6.5,
        driveDate: "2026-09-10",
        departments: [],
      }),
    );
  });

  it("omits untouched optional fields rather than sending empty strings", async () => {
    renderPage("WORKSHOP");
    await screen.findByLabelText("Subject");

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Kubernetes" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Orchestration" } });
    fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit request/ }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const body = apiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body.endDate).toBeUndefined();
    expect(body.organization).toBeUndefined();
    expect(body.contactEmail).toBeUndefined();
    expect(body.expectedParticipants).toBeUndefined();
  });

  it("shows a submitted request in the Actions panel with its status", async () => {
    withRequests([MY_PLACEMENT]);
    renderPage("PLACEMENT");

    const panel = await screen.findByRole("complementary");
    expect(await within(panel).findByText("Infosys campus drive")).toBeInTheDocument();
    expect(within(panel).getByText("pending")).toBeInTheDocument();
  });

  it("shows the admin's reason on a rejected request", async () => {
    withRequests([REJECTED]);
    renderPage("PLACEMENT");

    await screen.findByText("Off-season drive");
    expect(screen.getByText(/Dates clash with end-semester exams/)).toBeInTheDocument();
  });

  it("opens the full request from the panel and offers to withdraw it while pending", async () => {
    withRequests([MY_PLACEMENT]);
    renderPage("PLACEMENT");

    fireEvent.click(await screen.findByRole("button", { name: /Infosys campus drive/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Systems Engineer")).toBeInTheDocument();
    expect(within(dialog).getByText("6.5 LPA")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Withdraw request/ }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/collaboration/c-1"));
  });

  it("does not offer to withdraw a request the office has already decided on", async () => {
    withRequests([REJECTED]);
    renderPage("PLACEMENT");

    fireEvent.click(await screen.findByRole("button", { name: /Off-season drive/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Withdraw request/ })).toBeNull();
  });
});
