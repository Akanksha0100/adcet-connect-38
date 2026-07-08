import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { BadRequest, Forbidden, NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";
import { logger } from "../../lib/logger.js";
import { sendEmail } from "../../lib/mailer.js";
import { donationReceiptEmail } from "../../lib/email-templates.js";
import { generateReceiptPdf } from "../../lib/receipt.js";
import { getStorage } from "../../storage/index.js";
import * as razorpay from "../../lib/razorpay.js";

type DonationStatus = "PLEDGED" | "RECEIVED" | "CANCELLED";

const makeReceiptNo = (donation: { id: string; createdAt?: Date }): string => {
  const year = (donation.createdAt ?? new Date()).getFullYear();
  const suffix = donation.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `ADCET/${year}/${suffix}`;
};

export const listCampaigns = async (q: PaginationQuery & { active?: boolean }) => {
  const where: Prisma.DonationCampaignWhereInput = {
    ...(q.active !== undefined && { isActive: q.active }),
  };
  const [items, total] = await Promise.all([
    prisma.donationCampaign.findMany({
      where,
      orderBy: { startsAt: "desc" },
      include: { _count: { select: { donations: true } } },
      ...paginate(q),
    }),
    prisma.donationCampaign.count({ where }),
  ]);
  // Add raised amount per campaign (single grouped query for efficiency).
  const ids = items.map((c) => c.id);
  const raised = ids.length
    ? await prisma.donation.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: ids }, status: "RECEIVED" },
        _sum: { amount: true },
      })
    : [];
  const raisedMap = new Map(raised.map((r) => [r.campaignId, r._sum.amount ?? 0]));
  return {
    items: items.map((c) => ({ ...c, raisedAmount: raisedMap.get(c.id) ?? 0 })),
    pagination: paginationMeta(total, q),
  };
};

export const getCampaign = async (id: string) => {
  const campaign = await prisma.donationCampaign.findUnique({ where: { id } });
  if (!campaign) throw NotFound();
  const sum = await prisma.donation.aggregate({
    where: { campaignId: id, status: "RECEIVED" },
    _sum: { amount: true },
    _count: true,
  });
  return { ...campaign, raisedAmount: sum._sum.amount ?? 0, donorCount: sum._count };
};

export const createCampaign = (data: Prisma.DonationCampaignUncheckedCreateInput) =>
  prisma.donationCampaign.create({ data });
export const updateCampaign = (id: string, data: Prisma.DonationCampaignUpdateInput) =>
  prisma.donationCampaign.update({ where: { id }, data });
export const deleteCampaign = async (id: string) => {
  await prisma.donationCampaign.delete({ where: { id } });
};

/**
 * Step 1 of the payment flow: create a Razorpay order and a matching PLEDGED
 * donation row. Returns the data the browser needs to open Razorpay Checkout.
 * The donor's name/email are snapshotted so records/receipts stay correct.
 */
export const createOrder = async (
  userId: string,
  data: { amount: number; message?: string; isAnonymous?: boolean },
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw NotFound("User not found");

  const amount = Math.round(data.amount);
  const donorName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  const order = await razorpay.createOrder({
    amountPaise: amount * 100,
    receipt: `don_${Date.now()}`,
    notes: { userId },
  });

  const donation = await prisma.$transaction(async (tx) => {
    const d = await tx.donation.create({
      data: {
        userId,
        amount,
        currency: "INR",
        message: data.message ?? null,
        isAnonymous: !!data.isAnonymous,
        status: "PLEDGED",
        donorName,
        donorEmail: user.email,
        provider: "razorpay",
        razorpayOrderId: order.id,
      },
    });
    await tx.donationLedgerEntry.create({
      data: {
        donationId: d.id,
        actorId: userId,
        entryType: "ORDER_CREATED",
        status: "PLEDGED",
        amount,
        note: `Razorpay order ${order.id}`,
      },
    });
    return d;
  });

  return {
    donationId: donation.id,
    orderId: order.id,
    amount,
    currency: "INR",
    keyId: razorpay.getPublicKeyId(),
    donorName,
    donorEmail: user.email,
  };
};

/**
 * Idempotently transition a donation to RECEIVED. Safe to call from both the
 * frontend verify-callback and the Razorpay webhook — the first one wins.
 */
const markReceived = (
  id: string,
  paymentId: string,
  signature: string | null,
  method: string | null,
) =>
  prisma.$transaction(async (tx) => {
    const d = await tx.donation.findUnique({ where: { id } });
    if (!d) return null;
    if (d.status === "RECEIVED") return d;
    const updated = await tx.donation.update({
      where: { id },
      data: {
        status: "RECEIVED",
        razorpayPaymentId: paymentId,
        ...(signature ? { razorpaySignature: signature } : {}),
        ...(method ? { paymentMethod: method } : {}),
        paidAt: new Date(),
        receiptNo: d.receiptNo ?? makeReceiptNo(d),
      },
    });
    await tx.donationLedgerEntry.create({
      data: {
        donationId: id,
        entryType: "PAYMENT_CAPTURED",
        status: "RECEIVED",
        amount: updated.amount,
        note: paymentId ? `Payment ${paymentId}` : null,
      },
    });
    return updated;
  });

/**
 * Generate the PDF receipt, store it, and email it to the donor — exactly once.
 * Uses a conditional `updateMany` on `receiptSentAt` as a claim lock so a
 * concurrent verify + webhook don't both send. Best-effort: on failure the
 * lock is released so a later retry (webhook) can complete it.
 */
const sendReceipt = async (donationId: string): Promise<void> => {
  const claim = await prisma.donation.updateMany({
    where: { id: donationId, status: "RECEIVED", receiptSentAt: null },
    data: { receiptSentAt: new Date() },
  });
  if (claim.count !== 1) return; // already sent (or not received yet)

  try {
    const d = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!d) return;

    const donorName = d.donorName || `${d.user.firstName} ${d.user.lastName}`.trim() || "Donor";
    const donorEmail = d.donorEmail || d.user.email;
    const paidAt = d.paidAt ?? new Date();
    const receiptNo = d.receiptNo ?? makeReceiptNo(d);
    const fileName = `${receiptNo.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;

    const pdf = await generateReceiptPdf({
      receiptNo,
      donorName,
      donorEmail,
      amount: d.amount,
      currency: d.currency,
      paymentId: d.razorpayPaymentId,
      orderId: d.razorpayOrderId,
      method: d.paymentMethod,
      paidAt,
      message: d.message,
    });

    // Store the receipt so the admin can re-download it later.
    let receiptKey: string | undefined;
    try {
      const stored = await getStorage().upload({
        fileName,
        contentType: "application/pdf",
        scope: "receipt",
        ownerId: d.userId,
        body: pdf,
      });
      receiptKey = stored.key;
      await prisma.donation.update({ where: { id: d.id }, data: { receiptKey } });
    } catch (e) {
      logger.error({ err: e, donationId }, "failed to store donation receipt PDF");
    }

    const mail = donationReceiptEmail({
      donorName,
      amount: d.amount,
      currency: d.currency,
      receiptNo,
      paymentId: d.razorpayPaymentId,
      method: d.paymentMethod,
      paidAt,
      message: d.message,
    });
    await sendEmail({
      to: donorEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: [{ filename: fileName, content: pdf, contentType: "application/pdf" }],
    });

    await prisma.donationLedgerEntry.create({
      data: {
        donationId: d.id,
        entryType: "RECEIPT_SENT",
        status: "RECEIVED",
        amount: d.amount,
        receiptKey,
        note: `Receipt emailed to ${donorEmail}`,
      },
    });
  } catch (e) {
    logger.error({ err: e, donationId }, "failed to send donation receipt — releasing lock for retry");
    await prisma.donation
      .update({ where: { id: donationId }, data: { receiptSentAt: null } })
      .catch(() => undefined);
  }
};

/**
 * Step 2 (frontend callback): verify the Razorpay Checkout signature and
 * complete the donation. All trust is placed in the HMAC check, never the
 * browser-supplied amount/status.
 */
export const verifyPayment = async (
  userId: string,
  input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) => {
  const ok = razorpay.verifyPaymentSignature(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature,
  );
  if (!ok) throw BadRequest("Payment verification failed");

  const donation = await prisma.donation.findUnique({
    where: { razorpayOrderId: input.razorpay_order_id },
  });
  if (!donation) throw NotFound("Donation not found for this order");
  if (donation.userId !== userId) throw Forbidden();

  const payment = await razorpay.fetchPayment(input.razorpay_payment_id);
  await markReceived(
    donation.id,
    input.razorpay_payment_id,
    input.razorpay_signature,
    payment?.method ?? null,
  );
  await sendReceipt(donation.id);

  return prisma.donation.findUnique({ where: { id: donation.id } });
};

/**
 * Step 2 (webhook): the source of truth if the browser never returns. Verifies
 * the webhook signature, then completes the matching donation. Returns quickly
 * and never throws on unknown events so Razorpay always gets a 2xx.
 */
export const handleWebhook = async (rawBody: Buffer, signature: string | undefined) => {
  if (!signature || !razorpay.verifyWebhookSignature(rawBody, signature)) {
    throw BadRequest("Invalid webhook signature");
  }
  let event: any;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw BadRequest("Invalid webhook payload");
  }

  if (event?.event === "payment.captured" || event?.event === "order.paid") {
    const payment = event?.payload?.payment?.entity;
    const orderId = payment?.order_id as string | undefined;
    const paymentId = payment?.id as string | undefined;
    if (orderId && paymentId) {
      const donation = await prisma.donation.findUnique({ where: { razorpayOrderId: orderId } });
      if (donation) {
        await markReceived(donation.id, paymentId, null, payment?.method ?? null);
        await sendReceipt(donation.id);
      } else {
        logger.warn({ orderId }, "webhook: no donation matches order");
      }
    }
  }
  return { received: true };
};

export const listDonations = async (
  q: PaginationQuery & { campaignId?: string; status?: DonationStatus },
) => {
  const where: Prisma.DonationWhereInput = {
    ...(q.campaignId && { campaignId: q.campaignId }),
    ...(q.status && { status: q.status }),
  };
  const [items, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        campaign: { select: { id: true, title: true } },
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      ...paginate(q),
    }),
    prisma.donation.count({ where }),
  ]);
  // Anonymise where required.
  const cleaned = items.map((d) =>
    d.isAnonymous ? { ...d, user: { id: null, firstName: "Anonymous", lastName: "" } } : d,
  );
  return { items: cleaned, pagination: paginationMeta(total, q) };
};

export const myDonations = (userId: string) =>
  prisma.donation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { campaign: true },
  });

export const updateDonationStatus = (
  actorId: string,
  id: string,
  data: { status: DonationStatus; receiptKey?: string; note?: string },
) =>
  prisma.$transaction(async (tx) => {
    const donation = await tx.donation.update({
      where: { id },
      data: { status: data.status, receiptKey: data.receiptKey },
    });
    await tx.donationLedgerEntry.create({
      data: {
        donationId: donation.id,
        actorId,
        entryType: "STATUS_UPDATED",
        status: donation.status,
        amount: donation.amount,
        proofKey: donation.proofKey,
        receiptKey: data.receiptKey ?? donation.receiptKey,
        note: data.note ?? null,
      },
    });
    return donation;
  });
