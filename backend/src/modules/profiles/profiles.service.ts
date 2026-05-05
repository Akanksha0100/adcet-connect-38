import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { NotFound } from "../../lib/errors.js";

const profileInclude = {
  experiences: { orderBy: { startDate: "desc" as const } },
  educations: { orderBy: { startYear: "desc" as const } },
  skills: { include: { skill: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
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

export const updateMyProfile = (userId: string, data: Record<string, unknown>) =>
  prisma.profile.upsert({ where: { userId }, update: data, create: { userId, ...data } });

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