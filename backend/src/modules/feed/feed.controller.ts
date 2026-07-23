import type { Request, Response } from "express";
import type { z } from "zod";
import * as service from "./feed.service.js";
import type { listQuerySchema, reportsQuerySchema } from "./feed.validators.js";
import type { PaginationQuery } from "../../lib/pagination.js";

const caller = (req: Request) => ({ sub: req.auth!.sub, roles: req.auth!.roles });

export const list = async (req: Request, res: Response) =>
  res.json(await service.list(req.query as unknown as z.infer<typeof listQuerySchema>, caller(req)));

export const getById = async (req: Request, res: Response) =>
  res.json(await service.getById(req.params.id, caller(req)));

export const create = async (req: Request, res: Response) =>
  res.status(201).json(await service.create(caller(req), req.body));

export const update = async (req: Request, res: Response) =>
  res.json(await service.update(caller(req), req.params.id, req.body.content));

export const remove = async (req: Request, res: Response) => {
  await service.remove(caller(req), req.params.id);
  res.status(204).end();
};

export const toggleLike = async (req: Request, res: Response) =>
  res.json(await service.toggleLike(caller(req), req.params.id));

export const listComments = async (req: Request, res: Response) =>
  res.json(await service.listComments(req.params.id, req.query as unknown as PaginationQuery));

export const addComment = async (req: Request, res: Response) =>
  res.status(201).json(await service.addComment(caller(req), req.params.id, req.body.body));

export const removeComment = async (req: Request, res: Response) => {
  await service.removeComment(caller(req), req.params.id, req.params.commentId);
  res.status(204).end();
};

export const report = async (req: Request, res: Response) =>
  res.status(201).json(await service.report(caller(req), req.params.id, req.body.reason));

export const listReports = async (req: Request, res: Response) =>
  res.json(await service.listReports(req.query as unknown as z.infer<typeof reportsQuerySchema>));

export const resolveReport = async (req: Request, res: Response) =>
  res.json(await service.resolveReport(req.params.reportId, req.body.status));
