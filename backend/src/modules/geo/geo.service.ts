import { prisma } from "../../lib/prisma.js";

/**
 * Aggregate alumni count grouped by city — feeds the Geo Map UI.
 */
export const cities = async () => {
  const grouped = await prisma.profile.groupBy({
    by: ["city"],
    where: { city: { not: null }, user: { status: "APPROVED" } },
    _count: { _all: true },
  });
  return grouped
    .filter((g) => g.city)
    .map((g) => ({ city: g.city as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
};

export const companies = async () => {
  const grouped = await prisma.profile.groupBy({
    by: ["currentCompany"],
    where: { currentCompany: { not: null }, user: { status: "APPROVED" } },
    _count: { _all: true },
  });
  return grouped
    .filter((g) => g.currentCompany)
    .map((g) => ({ company: g.currentCompany as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
};

/** City × Company breakdown — used by the Admin Geo Map side panel. */
export const cityCompanyBreakdown = async () => {
  const profiles = await prisma.profile.findMany({
    where: { city: { not: null }, currentCompany: { not: null }, user: { status: "APPROVED" } },
    select: { city: true, currentCompany: true },
  });
  const map = new Map<string, Map<string, number>>();
  for (const p of profiles) {
    if (!p.city || !p.currentCompany) continue;
    if (!map.has(p.city)) map.set(p.city, new Map());
    const inner = map.get(p.city)!;
    inner.set(p.currentCompany, (inner.get(p.currentCompany) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([city, comps]) => ({
    city,
    totalAlumni: Array.from(comps.values()).reduce((a, b) => a + b, 0),
    companies: Array.from(comps.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count),
  }));
};