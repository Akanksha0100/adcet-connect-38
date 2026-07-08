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