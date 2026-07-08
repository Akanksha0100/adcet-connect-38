/**
 * Auth domain logic. Stateless functions that wrap Prisma + crypto utilities.
 * Controllers stay thin and delegate here.
 */
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { BadRequest, Conflict, Unauthorized } from "../../lib/errors.js";
import { sendEmail } from "../../lib/mailer.js";
import { passwordResetEmail } from "../../lib/email-templates.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import type { AppRoleName } from "../../config/constants.js";
import type { LoginInput, RegisterInput } from "./auth.validators.js";
import type { OAuthProfile } from "./providers/index.js";

const REFRESH_TTL_DAYS = 7;
const RESET_TTL_MINUTES = 60;

/** Best-effort resolution of the frontend base URL for building links. */
const frontendBaseUrl = (): string => {
  const origin = env.CORS_ORIGIN;
  if (!origin || origin === "*") return "http://localhost:8080";
  return origin.split(",")[0].trim();
};

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
          linkedinUrl: input.linkedinUrl,
          githubUrl: input.githubUrl || undefined,
          twitterUrl: input.twitterUrl || undefined,
          websiteUrl: input.websiteUrl || undefined,
          phone: input.phone || undefined,
          city: input.city || undefined,
          bio: input.bio || undefined,
          currentCompany: input.currentCompany || undefined,
          currentRole: input.currentRole || undefined,
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

/**
 * Start a password reset. Always resolves without revealing whether the email
 * exists (prevents account enumeration). If the account exists and has a
 * password, a single-use, time-limited token is emailed as a reset link.
 */
export const forgotPassword = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Silently succeed for unknown or OAuth-only accounts.
  if (!user || !user.passwordHash) return;

  // Invalidate any outstanding tokens for this user, then mint a fresh one.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
    },
  });

  const resetUrl = `${frontendBaseUrl()}/reset-password?token=${rawToken}`;
  try {
    const mail = passwordResetEmail(resetUrl, user.firstName, RESET_TTL_MINUTES);
    await sendEmail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (e) {
    logger.error({ err: e, userId: user.id }, "failed to send password reset email");
  }
};

/** Complete a password reset with a valid, unexpired, unused token. */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw BadRequest("This reset link is invalid or has expired. Please request a new one.");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Log the user out of all existing sessions after a reset.
    prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

/** Change password for a logged-in user (requires the current password). */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    throw BadRequest("Password change is not available for this account.");
  }
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw BadRequest("Your current password is incorrect.");
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

/**
 * Find-or-create a user from a normalized OAuth profile, then issue our own JWTs.
 * - If the OAuthAccount exists → log that user in.
 * - Else if a user with the same email exists → link the OAuth account to them.
 * - Else → create a new ALUMNI user (auto-approved since email is provider-verified).
 */
export const loginWithOAuth = async (profile: OAuthProfile) => {
  // 1. Already-linked account?
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } },
    include: { user: { include: { roles: true } } },
  });

  let user = existingLink?.user;

  // 2. Same email but no link yet → attach.
  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { roles: true },
    });
    if (byEmail) {
      await prisma.oAuthAccount.create({
        data: {
          userId: byEmail.id,
          provider: profile.provider,
          providerId: profile.providerId,
        },
      });
      user = byEmail;
    }
  }

  // 3. Brand-new user.
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        // SSO email is provider-verified → safe to auto-approve.
        status: profile.emailVerified ? "APPROVED" : "PENDING",
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        roles: { create: { role: "ALUMNI" } },
        profile: { create: {} },
        preferences: { create: {} },
        oauthAccounts: {
          create: { provider: profile.provider, providerId: profile.providerId },
        },
      },
      include: { roles: true },
    });
  }

  const roles = user.roles.map((r) => r.role as AppRoleName);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const tokens = await issueTokens(user, roles);
  return { user: publicUser(user, roles), ...tokens };
};

const publicUser = (
  u: { id: string; email: string; firstName: string; lastName: string; status: string; rejectionReason?: string | null },
  roles: AppRoleName[],
) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  status: u.status,
  rejectionReason: u.rejectionReason ?? null,
  roles,
});