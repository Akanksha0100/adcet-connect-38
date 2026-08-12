import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { NotFound } from "../../lib/errors.js";
import { resolveProfileLocation } from "../../lib/geocode.js";

const profileInclude = {
  experiences: { orderBy: { startDate: "desc" as const } },
  educations: { orderBy: { startYear: "desc" as const } },
  skills: { include: { skill: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  // Read-only here — chapter membership is changed via POST /chapters/join,
  // which enforces the alumni-only rule.
  chapter: { select: { id: true, slug: true, name: true, city: true, isActive: true } },
};

export const getMyProfile = async (userId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId }, include: profileInclude });
  if (!profile) throw NotFound("Profile not found");
  return profile;
};

export const getProfileByUserId = async (userId: string) => {
  const profile = await prisma.profile.findUnique({ where: { userId }, include: profileInclude });
  if (!profile) throw NotFound("Profile not found");
  return profile;
};

/**
 * Re-place the profile on the alumni map whenever the edit touches where the
 * alumnus lives.
 *
 * Only the offline gazetteer is consulted (`allowRemote` stays false), so a
 * profile save is a couple of indexed queries and never waits on an outbound
 * geocoder. A city the gazetteer doesn't know resolves to `null` and is picked
 * up by the nightly backfill instead — the alumnus is briefly unplaced, which
 * is much better than a slow or failing save.
 */
const withResolvedLocation = async (userId: string, data: Record<string, unknown>) => {
  if (!("city" in data) && !("country" in data)) return data;

  const current =
    "country" in data
      ? null
      : await prisma.profile.findUnique({ where: { userId }, select: { country: true } });
  const country = "country" in data ? (data.country as string | null) : current?.country ?? null;

  return { ...data, locationId: await resolveProfileLocation(data.city as string | null, country) };
};

export const updateMyProfile = async (userId: string, data: Record<string, unknown>) => {
  const withLocation = await withResolvedLocation(userId, data);
  return prisma.profile.upsert({
    where: { userId },
    update: withLocation,
    create: { userId, ...withLocation },
  });
};

export const addExperience = async (userId: string, data: Record<string, unknown>) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw NotFound();
  return prisma.workExperience.create({
    data: { ...(data as Prisma.WorkExperienceUncheckedCreateInput), profileId: profile.id },
  });
};

export const removeExperience = (id: string) => prisma.workExperience.delete({ where: { id } });

export const addEducation = async (userId: string, data: Record<string, unknown>) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw NotFound();
  return prisma.education.create({
    data: { ...(data as Prisma.EducationUncheckedCreateInput), profileId: profile.id },
  });
};

export const removeEducation = (id: string) => prisma.education.delete({ where: { id } });

export const setSkills = async (userId: string, skillNames: string[]) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw NotFound();
  // Upsert skills then reset profile linkage.
  const skills = await Promise.all(
    skillNames.map((name) =>
      prisma.skill.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
  await prisma.profileSkill.createMany({
    data: skills.map((s) => ({ profileId: profile.id, skillId: s.id })),
  });
  return skills;
};

export const getPreferences = async (userId: string) => {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  // Return defaults if not yet created
  return prefs ?? {
    userId,
    notificationsEmail: true,
    notificationsPush: true,
    darkMode: false,
    language: "en",
    theme: "default",
  };
};

export const updatePreferences = async (
  userId: string,
  data: Partial<{ theme: string; darkMode: boolean; notificationsEmail: boolean; notificationsPush: boolean }>,
) =>
  prisma.userPreferences.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });