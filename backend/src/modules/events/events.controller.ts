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
export const myPosted = async (req: Request, res: Response) =>
  res.json(await service.myPostedEvents(caller(req)!, req.query as unknown as Parameters<typeof service.myPostedEvents>[1]));
export const moderate = async (req: Request, res: Response) =>
  res.json(await service.moderate(req.params.id, req.body.status, req.body.reason));
export const listPending = async (req: Request, res: Response) =>
  res.json(await service.listPending(req.query as unknown as Parameters<typeof service.listPending>[0]));