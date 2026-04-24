import { prisma } from "../../lib/prisma.js";
import { NotFound } from "../../lib/errors.js";
import { paginate, paginationMeta, type PaginationQuery } from "../../lib/pagination.js";

export const listCampaigns = async (q: PaginationQuery & { active?: boolean }) => {
  const where: any = { ...(q.active !== undefined && { isActive: q.active }) };
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

export const createCampaign = (data: any) => prisma.donationCampaign.create({ data });
export const updateCampaign = (id: string, data: any) =>
  prisma.donationCampaign.update({ where: { id }, data });
export const deleteCampaign = async (id: string) => {
  await prisma.donationCampaign.delete({ where: { id } });
};

export const pledge = (userId: string, data: any) =>
  prisma.donation.create({ data: { ...data, userId, status: "PLEDGED" } });

export const listDonations = async (
  q: PaginationQuery & { campaignId?: string; status?: any },
) => {
  const where: any = {
    ...(q.campaignId && { campaignId: q.campaignId }),
    ...(q.status && { status: q.status }),
  };
  const [items, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
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

export const updateDonationStatus = (id: string, data: { status: any; receiptKey?: string }) =>
  prisma.donation.update({ where: { id }, data });