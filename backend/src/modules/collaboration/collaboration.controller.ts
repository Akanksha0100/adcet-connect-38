import type { Request, Response } from "express";
import type { z } from "zod";
import * as service from "./collaboration.service.js";
import type { listQuerySchema } from "./collaboration.validators.js";

const caller = (req: Request) => ({ sub: req.auth!.sub, roles: req.auth!.roles });

export const list = async (req: Request, res: Response) =>
  res.json(
    await service.list(req.query as unknown as z.infer<typeof listQuerySchema>, caller(req)),
  );
export const getById = async (req: Request, res: Response) =>
  res.json(await service.getById(caller(req), req.params.id));
export const create = async (req: Request, res: Response) =>
  res.status(201).json(await service.create(caller(req), req.body));
export const remove = async (req: Request, res: Response) => {
  await service.remove(caller(req), req.params.id);
  res.status(204).end();
};
export const moderate = async (req: Request, res: Response) =>
  res.json(
    await service.moderate(req.auth!.sub, req.params.id, req.body.status, req.body.reason),
  );
export const pendingCounts = async (_req: Request, res: Response) =>
  res.json(await service.pendingCounts());
