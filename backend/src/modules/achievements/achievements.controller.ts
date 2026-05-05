import type { Request, Response } from "express";
import type { z } from "zod";
import * as service from "./achievements.service.js";
import type { listQuerySchema } from "./achievements.validators.js";

const caller = (req: Request) => req.auth ? { sub: req.auth.sub, roles: req.auth.roles } : undefined;

export const list = async (req: Request, res: Response) =>
  res.json(await service.list(req.query as unknown as z.infer<typeof listQuerySchema>, caller(req)));
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
export const moderate = async (req: Request, res: Response) =>
  res.json(await service.moderate(req.params.id, req.body.status, req.body.reason));
export const listPending = async (req: Request, res: Response) =>
  res.json(await service.listPending(req.query as unknown as Parameters<typeof service.listPending>[0]));