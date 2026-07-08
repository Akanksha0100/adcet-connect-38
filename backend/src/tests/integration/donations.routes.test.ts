/**
 * Integration tests for /api/v1/donations.
 * Validates campaigns CRUD (admin-only), pledge submission (users),
 * donor list (admin), and donation status updates.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const userToken = makeToken({ sub: "user-1" });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/donations/campaigns", () => {
  it("200 list returns raised amounts", async () => {
    prisma.donationCampaign.findMany.mockResolvedValueOnce([{ id: "c1" } as any]);
    prisma.donationCampaign.count.mockResolvedValueOnce(1);
    prisma.donation.groupBy.mockResolvedValueOnce([
      { campaignId: "c1", _sum: { amount: 5000 } } as any,
    ]);
    const res = await request(app)
      .get("/api/v1/donations/campaigns")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body.items[0].raisedAmount).toBe(5000);
  });

  it("404 single campaign missing", async () => {
    prisma.donationCampaign.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get("/api/v1/donations/campaigns/x")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(404);
  });

  it("403 non-admin cannot create campaign", async () => {
    const res = await request(app)
      .post("/api/v1/donations/campaigns")
      .set("Authorization", bearer(userToken))
      .send({
        title: "Library Fund",
        description: "Buy new books for the library this year.",
        goalAmount: 100000,
        startsAt: new Date().toISOString(),
      });
    expect(res.status).toBe(403);
  });

  it("422 create with invalid goal amount", async () => {
    const res = await request(app)
      .post("/api/v1/donations/campaigns")
      .set("Authorization", bearer(adminToken))
      .send({
        title: "X",
        description: "shortttt",
        goalAmount: -10,
        startsAt: new Date().toISOString(),
      });
    expect(res.status).toBe(422);
  });

  it("201 admin creates a campaign", async () => {
    prisma.donationCampaign.create.mockResolvedValueOnce({ id: "c1" } as any);
    const res = await request(app)
      .post("/api/v1/donations/campaigns")
      .set("Authorization", bearer(adminToken))
      .send({
        title: "Library Fund",
        description: "Buy new books for the library this year.",
        goalAmount: 100000,
        startsAt: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
  });
});

describe("/donations (order/verify & admin list)", () => {
  it("422 create order with missing amount", async () => {
    const res = await request(app)
      .post("/api/v1/donations/order")
      .set("Authorization", bearer(userToken))
      .send({});
    expect(res.status).toBe(422);
  });

  it("501 create order when Razorpay is not configured", async () => {
    // The test environment has no RAZORPAY_* keys, so ordering is unavailable.
    const res = await request(app)
      .post("/api/v1/donations/order")
      .set("Authorization", bearer(userToken))
      .send({ amount: 500 });
    expect(res.status).toBe(501);
  });

  it("400 verify with an invalid signature", async () => {
    const res = await request(app)
      .post("/api/v1/donations/verify")
      .set("Authorization", bearer(userToken))
      .send({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "deadbeef",
      });
    expect(res.status).toBe(400);
  });

  it("400 webhook with an invalid signature", async () => {
    const res = await request(app)
      .post("/api/v1/donations/webhook")
      .set("x-razorpay-signature", "bad")
      .send({ event: "payment.captured" });
    expect(res.status).toBe(400);
  });

  it("403 non-admin cannot list all donations", async () => {
    const res = await request(app)
      .get("/api/v1/donations")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 admin lists donations and anonymises rows flagged anonymous", async () => {
    prisma.donation.findMany.mockResolvedValueOnce([
      { id: "d1", isAnonymous: true, user: { id: "u1", firstName: "Real", lastName: "Name" } } as any,
      { id: "d2", isAnonymous: false, user: { id: "u2", firstName: "John", lastName: "Doe" } } as any,
    ]);
    prisma.donation.count.mockResolvedValueOnce(2);
    const res = await request(app)
      .get("/api/v1/donations")
      .set("Authorization", bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.items[0].user.firstName).toBe("Anonymous");
    expect(res.body.items[1].user.firstName).toBe("John");
  });

  it("422 update status with invalid value", async () => {
    const res = await request(app)
      .patch("/api/v1/donations/d1/status")
      .set("Authorization", bearer(adminToken))
      .send({ status: "WHATEVER" });
    expect(res.status).toBe(422);
  });

  it("200 admin updates donation status", async () => {
    prisma.donation.update.mockResolvedValueOnce({ id: "d1", status: "RECEIVED" } as any);
    const res = await request(app)
      .patch("/api/v1/donations/d1/status")
      .set("Authorization", bearer(adminToken))
      .send({ status: "RECEIVED" });
    expect(res.status).toBe(200);
  });
});