import type { Request, Response } from "express";
import * as service from "./achievements.service.js";

const caller = (req: Request) => req.auth ? { sub: req.auth.sub, roles: req.auth.roles } : undefined;

export const list = async (req: Request, res: Response) =>
  res.json(await service.list(req.query as any, caller(req)));
export const create = async (req: Request, res: Response) =>
  res.status(201).json(await service.create(caller(req)!, req.body));
export const update = async (req: Request, res: Response) =>
  res.json(await service.update(caller(req)!, req.params.id, req.body));
export const remove = async (req: Request, res: Response) => {
  await service.remove(caller(req)!, req.params.id);
  res.status(204).end();
};
export const moderate = async (req: Request, res: Response) =>
  res.json(await service.moderate(req.params.id, req.body.status));
export const listPending = async (req: Request, res: Response) =>
  res.json(await service.listPending(req.query as any));