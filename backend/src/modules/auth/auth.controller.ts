import type { Request, Response } from "express";
import * as service from "./auth.service.js";
import { BadRequest, NotImplemented, Unauthorized } from "../../lib/errors.js";
import { getProvider } from "./providers/index.js";
import { env } from "../../config/env.js";
import crypto from "node:crypto";

// In-memory state store for CSRF protection on the OAuth flow.
// Good enough for a single-instance dev server; swap for Redis in prod.
const stateStore = new Map<string, { provider: string; expiresAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;
const sweepStates = () => {
  const now = Date.now();
  for (const [k, v] of stateStore) if (v.expiresAt < now) stateStore.delete(k);
};

export const register = async (req: Request, res: Response) => {
  const result = await service.register(req.body);
  res.status(201).json(result);
};

export const login = async (req: Request, res: Response) => {
  const result = await service.login(req.body);
  res.json(result);
};

export const refresh = async (req: Request, res: Response) => {
  const tokens = await service.refresh(req.body.refreshToken);
  res.json(tokens);
};

export const logout = async (req: Request, res: Response) => {
  await service.logout(req.body.refreshToken);
  res.status(204).end();
};

export const me = async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const user = await service.me(req.auth.sub);
  res.json(user);
};

/** OAuth endpoints are scaffolded but intentionally unimplemented (see PROJECT_CONTEXT). */
/**
 * GET /auth/oauth/:provider
 * Generates a CSRF state token and 302s the browser to the provider's authorize URL.
 */
export const oauthStart = async (req: Request, res: Response) => {
  const provider = getProvider(req.params.provider);
  if (!provider) throw BadRequest(`Unknown OAuth provider: ${req.params.provider}`);
  if (!provider.isConfigured()) {
    throw NotImplemented(
      `OAuth provider "${provider.id}" is not configured. Set ${provider.id.toUpperCase()}_CLIENT_ID/SECRET.`,
    );
  }
  sweepStates();
  const state = crypto.randomBytes(24).toString("hex");
  stateStore.set(state, { provider: provider.id, expiresAt: Date.now() + STATE_TTL_MS });
  return res.redirect(provider.getAuthUrl(state));
};

/**
 * GET /auth/oauth/:provider/callback?code=...&state=...
 * Verifies state, exchanges code for a profile, issues JWTs, and bounces the
 * browser to the frontend with tokens in the URL fragment so the SPA can pick
 * them up without exposing them to server logs.
 */
export const oauthCallback = async (req: Request, res: Response) => {
  const provider = getProvider(req.params.provider);
  if (!provider) throw BadRequest(`Unknown OAuth provider: ${req.params.provider}`);
  if (!provider.isConfigured()) throw NotImplemented(`Provider "${provider.id}" not configured`);

  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (error) throw Unauthorized(`OAuth error from provider: ${error}`);
  if (!code || !state) throw BadRequest("Missing code/state in OAuth callback");

  sweepStates();
  const stored = stateStore.get(state);
  if (!stored || stored.provider !== provider.id) throw Unauthorized("Invalid OAuth state");
  stateStore.delete(state);

  const profile = await provider.exchangeCode(code);
  const result = await service.loginWithOAuth(profile);

  const target = env.OAUTH_SUCCESS_REDIRECT;
  if (!target) {
    // Fall back to JSON if no SPA redirect URL is configured.
    return res.json(result);
  }
  const fragment = new URLSearchParams({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }).toString();
  return res.redirect(`${target}#${fragment}`);
};

export const forgotPassword = async (req: Request, res: Response) => {
  await service.forgotPassword(req.body.email);
  // Always 202 regardless of whether the email exists (no user enumeration).
  res.status(202).json({ message: "If an account exists for that email, a reset link has been sent." });
};
export const resetPassword = async (req: Request, res: Response) => {
  await service.resetPassword(req.body.token, req.body.newPassword);
  res.json({ message: "Your password has been reset. You can now sign in." });
};
export const changePassword = async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  await service.changePassword(req.auth.sub, req.body.currentPassword, req.body.newPassword);
  res.json({ message: "Password updated." });
};