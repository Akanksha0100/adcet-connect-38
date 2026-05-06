/**
 * Branch coverage for donations service:
 * filter combinations, anonymisation toggle, raisedAmount aggregation
 * with empty/non-empty campaign list, and 404 paths.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const svc = await import("../../../modules/donations/donations.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("donations.service — listCampaigns", () => {
  it("no filters → empty where, no groupBy when there are no campaigns", async () => {
    prismaMock.donationCampaign.findMany.mockResolvedValueOnce([]);
    prismaMock.donationCampaign.count.mockResolvedValueOnce(0);
    const out = await svc.listCampaigns({ page: 1, pageSize: 10 } as any);
    expect(prismaMock.donation.groupBy).not.toHaveBeenCalled();
    expect(out.items).toEqual([]);
  });

  it("active=true forwards isActive filter and merges raisedAmount per campaign", async () => {
    prismaMock.donationCampaign.findMany.mockResolvedValueOnce([
      { id: "c-1" },
      { id: "c-2" },
    ]);
    prismaMock.donationCampaign.count.mockResolvedValueOnce(2);
    prismaMock.donation.groupBy.mockResolvedValueOnce([
      { campaignId: "c-1", _sum: { amount: 1000 } },
      { campaignId: "c-2", _sum: { amount: null } }, // null branch → 0
    ]);
    const out = await svc.listCampaigns({ page: 1, pageSize: 10, active: true } as any);
    const findArg = prismaMock.donationCampaign.findMany.mock.calls[0][0] as any;
    expect(findArg.where.isActive).toBe(true);
    expect(out.items[0].raisedAmount).toBe(1000);
    expect(out.items[1].raisedAmount).toBe(0);
  });
});

describe("donations.service — getCampaign", () => {
  it("404 when not found", async () => {
    prismaMock.donationCampaign.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getCampaign("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("returns 0 raised when aggregate is empty", async () => {
    prismaMock.donationCampaign.findUnique.mockResolvedValueOnce({ id: "c-1" });
    prismaMock.donation.aggregate.mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 });
    const out = await svc.getCampaign("c-1");
    expect(out.raisedAmount).toBe(0);
    expect(out.donorCount).toBe(0);
  });

  it("forwards aggregated values when present", async () => {
    prismaMock.donationCampaign.findUnique.mockResolvedValueOnce({ id: "c-1" });
    prismaMock.donation.aggregate.mockResolvedValueOnce({ _sum: { amount: 250 }, _count: 3 });
    const out = await svc.getCampaign("c-1");
    expect(out).toMatchObject({ raisedAmount: 250, donorCount: 3 });
  });
});

describe("donations.service — listDonations", () => {
  it("anonymises donations flagged isAnonymous=true and keeps others intact", async () => {
    prismaMock.donation.findMany.mockResolvedValueOnce([
      { id: "d-1", isAnonymous: true, user: { id: "u-1", firstName: "Alice", lastName: "A" } },
      { id: "d-2", isAnonymous: false, user: { id: "u-2", firstName: "Bob", lastName: "B" } },
    ]);
    prismaMock.donation.count.mockResolvedValueOnce(2);
    const out = await svc.listDonations({ page: 1, pageSize: 10 } as any);
    expect(out.items[0].user).toEqual({ id: null, firstName: "Anonymous", lastName: "" });
    expect(out.items[1].user.firstName).toBe("Bob");
  });

  it("forwards campaignId / status filters", async () => {
    prismaMock.donation.findMany.mockResolvedValueOnce([]);
    prismaMock.donation.count.mockResolvedValueOnce(0);
    await svc.listDonations({ page: 1, pageSize: 10, campaignId: "c-1", status: "RECEIVED" } as any);
    const where = (prismaMock.donation.findMany.mock.calls[0][0] as any).where;
    expect(where).toEqual({ campaignId: "c-1", status: "RECEIVED" });
  });
});

describe("donations.service — pledge", () => {
  it("forces status=PLEDGED and the userId from caller", async () => {
    prismaMock.donation.create.mockResolvedValueOnce({});
    await svc.pledge("u-9", { amount: 100, campaignId: "c-1", currency: "INR" } as any);
    expect((prismaMock.donation.create.mock.calls[0][0] as any).data).toMatchObject({
      userId: "u-9",
      status: "PLEDGED",
    });
  });
});