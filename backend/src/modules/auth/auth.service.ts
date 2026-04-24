/**
 * Auth domain logic. Stateless functions that wrap Prisma + crypto utilities.
 * Controllers stay thin and delegate here.
 */
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { Conflict, Unauthorized } from "../../lib/errors.js";
import type { AppRoleName } from "../../config/constants.js";
import type { LoginInput, RegisterInput } from "./auth.validators.js";

const REFRESH_TTL_DAYS = 7;

const issueTokens = async (user: { id: string; email: string }, roles: AppRoleName[]) => {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles });
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken };
};

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw Conflict("Email already registered");

  const role: AppRoleName = input.role ?? "ALUMNI";
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      // PENDING until an admin approves. Recruiters & alumni need admin moderation.
      status: "PENDING",
      roles: { create: { role } },
      profile: {
        create: {
          department: input.department,
          degree: input.degree,
          admissionYear: input.admissionYear,
          graduationYear: input.graduationYear,
        },
      },
      preferences: { create: {} },
    },
  });

  const tokens = await issueTokens(user, [role]);
  return { user: publicUser(user, [role]), ...tokens };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { roles: true },
  });
  if (!user || !user.passwordHash) throw Unauthorized("Invalid credentials");
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw Unauthorized("Invalid credentials");

  const roles = user.roles.map((r) => r.role as AppRoleName);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const tokens = await issueTokens(user, roles);
  return { user: publicUser(user, roles), ...tokens };
};

export const refresh = async (refreshToken: string) => {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Unauthorized("Invalid refresh token");
  }
  const tokenRow = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt < new Date()) {
    throw Unauthorized("Refresh token expired or revoked");
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { roles: true },
  });
  if (!user) throw Unauthorized();

  // Rotate: revoke old, issue new pair.
  await prisma.refreshToken.update({
    where: { id: tokenRow.id },
    data: { revokedAt: new Date() },
  });
  const roles = user.roles.map((r) => r.role as AppRoleName);
  return issueTokens(user, roles);
};

export const logout = async (refreshToken: string) => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const me = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true, profile: true, preferences: true },
  });
  if (!user) throw Unauthorized();
  return publicUser(user, user.roles.map((r) => r.role as AppRoleName));
};

const publicUser = (
  u: { id: string; email: string; firstName: string; lastName: string; status: string },
  roles: AppRoleName[],
) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  status: u.status,
  roles,
});