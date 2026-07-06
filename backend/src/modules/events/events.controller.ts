import type { Request, Response } from "express";
import * as service from "./events.service.js";

const caller = (req: Request) => req.auth ? { sub: req.auth.sub, roles: req.auth.roles } : undefined;

export const list = async (req: Request, res: Response) =>
  res.json(await service.list(req.query as unknown as Parameters<typeof service.list>[0], caller(req)));
export const getById = async (req: Request, res: Response) =>
  res.json(await service.getById(req.params.id));
export const create = async (req: Request, res: Response) =>
  res.status(201).json(await service.create(caller(req)!, req.body));
export const update = async (req: Request, res: Response) =>
  res.json(await service.update(caller(req)!, req.params.id, req.body));
export const remove = async (req: Request, res: Response) => {
  await service.remove(caller(req)!, req.params.id);
  res.status(204).end();
};
export const rsvp = async (req: Request, res: Response) =>
  res.json(await service.rsvp(req.params.id, req.auth!.sub, req.body.status));
export const listRsvps = async (req: Request, res: Response) =>
  res.json(await service.listRsvps(caller(req)!, req.params.id));

/** Public email RSVP handler — no auth required, token-based. */
export const emailRsvp = async (req: Request, res: Response) => {
  const { token, response } = req.query as { token: string; response: string };
  const html = await service.handleEmailRsvp(
    req.params.id,
    token,
    response as "YES" | "NO" | "NOT_SURE" | "MAYBE",
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
};
