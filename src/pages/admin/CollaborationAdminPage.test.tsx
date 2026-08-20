/**
 * Alumni Collaboration, admin side.
 *
 * The inbox is one component per kind at one status, so what matters is that it
 * asks for the right slice, that a decision reaches the API with its reason
 * attached, and that a decided request offers the reverse of the decision
 * rather than the same button again.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { CollaborationRequest, CollaborationType } from "@/lib/collaboration";

const PENDING: CollaborationRequest = {
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
  contactEmail: "hr@infosys.example",
  createdAt: "2026-08-18T09:00:00.000Z",
  user: { id: "u-1", firstName: "Alice", lastName: "Patil", email: "alice@adcet.in" },
};

const APPROVED: CollaborationRequest = { ...PENDING, id: "c-2", status: "APPROVED" };

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

const CollaborationAdminPage = (await import("./CollaborationAdminPage")).default;

const withRequests = (items: CollaborationRequest[]) =>
  apiGet.mockResolvedValue({
    items,
    pagination: { total: items.length, page: 1, pageSize: 50, totalPages: 1 },
  });

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiPost.mockResolvedValue({ id: "c-1", status: "APPROVED" });
  withRequests([PENDING]);
});

const renderPage = (type: CollaborationType = "PLACEMENT") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CollaborationAdminPage type={type} />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe("CollaborationAdminPage", () => {
  it("opens on the pending queue for its own kind", async () => {
    renderPage("WORKSHOP");
    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith("/collaboration", {
        type: "WORKSHOP",
        status: "PENDING",
        q: undefined,
        pageSize: 50,
      }),
    );
  });

  it("switches queue when another status tab is picked", async () => {
    renderPage("PLACEMENT");
    await screen.findByText("Infosys campus drive");

    fireEvent.click(screen.getByRole("button", { name: "Approved" }));

    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith(
        "/collaboration",
        expect.objectContaining({ status: "APPROVED" }),
      ),
    );
  });

  it("shows who asked and what they asked for", async () => {
    renderPage("PLACEMENT");
    await screen.findByText("Infosys campus drive");
    expect(screen.getByText("Alice Patil")).toBeInTheDocument();
    expect(screen.getByText("Systems Engineer")).toBeInTheDocument();
  });

  it("approves straight from the card", async () => {
    renderPage("PLACEMENT");
    await screen.findByText("Infosys campus drive");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/collaboration/c-1/moderate", {
        status: "APPROVED",
        reason: undefined,
      }),
    );
  });

  it("sends the reason along with a rejection", async () => {
    renderPage("PLACEMENT");
    await screen.findByText("Infosys campus drive");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Reason/), {
      target: { value: "Dates clash with exams" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/collaboration/c-1/moderate", {
        status: "REJECTED",
        reason: "Dates clash with exams",
      }),
    );
  });

  it("offers the reverse decision on a request already approved", async () => {
    withRequests([APPROVED]);
    renderPage("PLACEMENT");
    await screen.findByText("Infosys campus drive");

    expect(screen.getByRole("button", { name: /Revoke approval/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Approve$/ })).toBeNull();
  });

  it("opens the full request, showing the details the office needs to follow up", async () => {
    renderPage("PLACEMENT");
    await screen.findByText("Infosys campus drive");

    fireEvent.click(screen.getByRole("button", { name: /View full request/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Alice Patil/)).toBeInTheDocument();
    expect(within(dialog).getByText("hr@infosys.example")).toBeInTheDocument();
    expect(within(dialog).getByText("Computer Science and Engineering")).toBeInTheDocument();
  });
});
