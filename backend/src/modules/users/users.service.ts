import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { NotFound, Unauthorized } from "../../lib/errors.js";

export const updateMe = (userId: string, data: { firstName?: string; lastName?: string }) =>
  prisma.user.update({ where: { id: userId }, data });

export const getPreferences = async (userId: string) => {
  const prefs =
    (await prisma.userPreferences.findUnique({ where: { userId } })) ??
    (await prisma.userPreferences.create({ data: { userId } }));
  return prefs;
};

export const updatePreferences = (userId: string, data: Record<string, unknown>) =>
  prisma.userPreferences.upsert({ where: { userId }, update: data, create: { userId, ...data } });

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw NotFound();
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw Unauthorized("Current password incorrect");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  // Revoke all refresh tokens for safety.
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};