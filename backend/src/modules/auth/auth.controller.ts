import type { Request, Response } from "express";
import * as service from "./auth.service.js";
import { NotImplemented, Unauthorized } from "../../lib/errors.js";

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
export const oauthStart = async (_req: Request, _res: Response) => {
  throw NotImplemented("OAuth provider not configured");
};
export const oauthCallback = async (_req: Request, _res: Response) => {
  throw NotImplemented("OAuth provider not configured");
};

export const forgotPassword = async (_req: Request, res: Response) => {
  // Email provider not wired — always return 202 to avoid user enumeration.
  res.status(202).json({ message: "If the email exists, a reset link has been sent." });
};
export const resetPassword = async (_req: Request, _res: Response) => {
  throw NotImplemented("Password reset flow not wired (no email provider)");
};