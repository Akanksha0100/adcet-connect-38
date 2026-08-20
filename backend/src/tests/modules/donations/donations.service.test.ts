/**
 * Branch coverage for donations service:
 * filter combinations, anonymisation toggle, raisedAmount aggregation
 * with empty/non-empty campaign list, and 404 paths.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const razorpayMock = {
  isConfigured: jest.fn(() => true),
  getPublicKeyId: jest.fn(() => "rzp_test_key"),
  createOrder: jest.fn(async () => ({ id: "order_123", amount: 500000, currency: "INR", status: "created" })),
  verifyPaymentSignature: jest.fn(() => false),
  verifyWebhookSignature: jest.fn(() => false),
  fetchPayment: jest.fn(async () => null),
};
jest.unstable_mockModule("../../../lib/razorpay.js", () => razorpayMock);

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

describe("donations.service — createOrder", () => {
  it("creates a Razorpay order and a PLEDGED donation with the donor snapshot", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "u-9",
      firstName: "Alice",
      lastName: "A",
      email: "alice@adcet.in",
    });
    prismaMock.donation.create.mockResolvedValueOnce({ id: "d-1", amount: 5000 });
    prismaMock.donationLedgerEntry.create.mockResolvedValueOnce({});

    const out = await svc.createOrder("u-9", { amount: 5000, message: "For the library" });

    expect(razorpayMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 500000 }),
    );
    const created = (prismaMock.donation.create.mock.calls[0][0] as any).data;
    expect(created).toMatchObject({
      userId: "u-9",
      status: "PLEDGED",
      razorpayOrderId: "order_123",
      donorName: "Alice A",
      donorEmail: "alice@adcet.in",
    });
    expect(out).toMatchObject({ orderId: "order_123", keyId: "rzp_test_key", amount: 5000 });
  });

  describe("campaign selection", () => {
    const donor = { id: "u-9", firstName: "Alice", lastName: "A", email: "alice@adcet.in" };
    const openCampaign = (over: Record<string, unknown> = {}) => ({
      id: "c-1",
      title: "Laboratory Modernisation Drive",
      isActive: true,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 86_400_000),
      ...over,
    });

    const orderFor = (campaignId?: string) => {
      prismaMock.user.findUnique.mockResolvedValueOnce(donor);
      prismaMock.donation.create.mockResolvedValueOnce({ id: "d-1", amount: 5000 });
      prismaMock.donationLedgerEntry.create.mockResolvedValueOnce({});
      return svc.createOrder("u-9", { amount: 5000, campaignId });
    };

    it("records the chosen campaign on the donation", async () => {
      prismaMock.donationCampaign.findUnique.mockResolvedValueOnce(openCampaign());
      await orderFor("c-1");

      const created = (prismaMock.donation.create.mock.calls[0][0] as any).data;
      expect(created.campaignId).toBe("c-1");
      // The ledger note names the cause, so reconciliation doesn't need a join.
      const note = (prismaMock.donationLedgerEntry.create.mock.calls[0][0] as any).data.note;
      expect(note).toContain("Laboratory Modernisation Drive");
    });

    it("treats an omitted campaign as a general-fund gift", async () => {
      await orderFor(undefined);
      const created = (prismaMock.donation.create.mock.calls[0][0] as any).data;
      expect(created.campaignId).toBeNull();
      expect(prismaMock.donationCampaign.findUnique).not.toHaveBeenCalled();
    });

    it("404s on a campaign that does not exist", async () => {
      prismaMock.donationCampaign.findUnique.mockResolvedValueOnce(null);
      prismaMock.user.findUnique.mockResolvedValueOnce(donor);
      await expect(svc.createOrder("u-9", { amount: 5000, campaignId: "gone" })).rejects.toMatchObject(
        { status: 404 },
      );
    });

    it.each([
      ["archived", { isActive: false }],
      ["not yet open", { startsAt: new Date(Date.now() + 86_400_000) }],
      ["already closed", { endsAt: new Date(Date.now() - 86_400_000) }],
      ])("refuses a campaign that is %s, without charging anyone", async (_label, over) => {
      prismaMock.donationCampaign.findUnique.mockResolvedValueOnce(openCampaign(over));
      prismaMock.user.findUnique.mockResolvedValueOnce(donor);

      await expect(
        svc.createOrder("u-9", { amount: 5000, campaignId: "c-1" }),
      ).rejects.toMatchObject({ status: 400 });

      // Nothing may reach Razorpay or the ledger once the campaign is rejected.
      expect(razorpayMock.createOrder).not.toHaveBeenCalled();
      expect(prismaMock.donation.create).not.toHaveBeenCalled();
    });
  });
});

describe("donations.service — verifyPayment", () => {
  it("rejects a tampered/invalid signature", async () => {
    razorpayMock.verifyPaymentSignature.mockReturnValueOnce(false);
    await expect(
      svc.verifyPayment("u-9", {
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "bad",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("blocks completing another user's donation", async () => {
    razorpayMock.verifyPaymentSignature.mockReturnValueOnce(true);
    prismaMock.donation.findUnique.mockResolvedValueOnce({ id: "d-1", userId: "someone-else" });
    await expect(
      svc.verifyPayment("u-9", {
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "good",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("donations.service — handleWebhook", () => {
  it("rejects an invalid webhook signature", async () => {
    razorpayMock.verifyWebhookSignature.mockReturnValueOnce(false);
    await expect(
      svc.handleWebhook(Buffer.from("{}"), "sig"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("acknowledges unknown events without side effects", async () => {
    razorpayMock.verifyWebhookSignature.mockReturnValueOnce(true);
    const out = await svc.handleWebhook(Buffer.from(JSON.stringify({ event: "order.created" })), "sig");
    expect(out).toEqual({ received: true });
    expect(prismaMock.donation.findUnique).not.toHaveBeenCalled();
  });
});
/**
 * The public honour roll. What matters here is what is *left out* — anonymous
 * gifts, unpaid pledges and unapproved accounts — because the endpoint has no
 * session behind it and the result lands on the landing page.
 */
describe("donations.service — topDonors", () => {
  beforeEach(() => svc.invalidateTopDonors());

  const groupedRows = [
    { userId: "u-1", _sum: { amount: 250000 } },
    { userId: "u-2", _sum: { amount: 90000 } },
  ];
  const userRows = [
    { id: "u-2", firstName: "Bob", lastName: "Kulkarni", profile: { avatarKey: null, graduationYear: 2016 } },
    { id: "u-1", firstName: "Alice", lastName: "Patil", profile: { avatarKey: "avatar/a.png", graduationYear: 2020 } },
  ];

  it("counts only received, non-anonymous gifts from approved accounts", async () => {
    prismaMock.donation.groupBy.mockResolvedValueOnce(groupedRows);
    prismaMock.user.findMany.mockResolvedValueOnce(userRows);

    await svc.topDonors(12);

    const args: any = prismaMock.donation.groupBy.mock.calls.at(-1)![0];
    expect(args.where).toMatchObject({
      status: "RECEIVED",
      isAnonymous: false,
      user: { status: "APPROVED" },
    });
    expect(args.orderBy).toEqual({ _sum: { amount: "desc" } });
    expect(args.take).toBe(12);
  });

  it("keeps the largest-first order even though findMany returns its own", async () => {
    prismaMock.donation.groupBy.mockResolvedValueOnce(groupedRows);
    prismaMock.user.findMany.mockResolvedValueOnce(userRows);

    const out = await svc.topDonors(12);

    expect(out.map((d) => [d.name, d.amount])).toEqual([
      ["Alice Patil", 250000],
      ["Bob Kulkarni", 90000],
    ]);
    // The name and photo come from the account, not the frozen donorName —
    // that is what makes the roll follow the alumni data.
    expect(out[0].avatarKey).toBe("avatar/a.png");
    expect(out[0].graduationYear).toBe(2020);
  });

  it("drops a donor whose account has since vanished", async () => {
    prismaMock.donation.groupBy.mockResolvedValueOnce(groupedRows);
    prismaMock.user.findMany.mockResolvedValueOnce([userRows[1]]);

    const out = await svc.topDonors(12);
    expect(out.map((d) => d.id)).toEqual(["u-1"]);
  });

  it("returns nothing, and asks for no users, when nobody has given yet", async () => {
    prismaMock.donation.groupBy.mockResolvedValueOnce([]);

    expect(await svc.topDonors(12)).toEqual([]);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("caches per limit, and a settled payment drops the cache", async () => {
    prismaMock.donation.groupBy.mockResolvedValue(groupedRows);
    prismaMock.user.findMany.mockResolvedValue(userRows);

    await svc.topDonorsCached(12);
    await svc.topDonorsCached(12);
    expect(prismaMock.donation.groupBy).toHaveBeenCalledTimes(1);

    svc.invalidateTopDonors();
    await svc.topDonorsCached(12);
    expect(prismaMock.donation.groupBy).toHaveBeenCalledTimes(2);
  });
});
