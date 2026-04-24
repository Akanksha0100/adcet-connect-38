/**
 * Access + refresh JWT helpers. Access tokens are short-lived (15m) and carry
 * the user's roles claim; refresh tokens are opaque-ish, persisted hashed in DB.
 */
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { AppRoleName } from "../config/constants.js";

export interface AccessClaims {
  sub: string;
  email: string;
  roles: AppRoleName[];
}

const accessOpts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"] };
const refreshOpts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"] };

export const signAccessToken = (claims: AccessClaims) =>
  jwt.sign(claims, env.JWT_ACCESS_SECRET, accessOpts);

export const signRefreshToken = (sub: string) =>
  jwt.sign({ sub, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, refreshOpts);

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims & { iat: number; exp: number };

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string; iat: number; exp: number };

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");