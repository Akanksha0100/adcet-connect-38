import type { Request, Response } from "express";
import * as service from "./notifications.service.js";

export const list = async (req: Request, res: Response) =>
  res.json(await service.list(req.auth!.sub, req.query as any));
export const unreadCount = async (req: Request, res: Response) =>
  res.json(await service.unreadCount(req.auth!.sub));
export const markRead = async (req: Request, res: Response) => {
  await service.markRead(req.auth!.sub, req.params.id);
  res.status(204).end();
};
export const markAllRead = async (req: Request, res: Response) => {
  await service.markAllRead(req.auth!.sub);
  res.status(204).end();
};