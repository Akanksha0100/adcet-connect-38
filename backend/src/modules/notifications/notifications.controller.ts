import type { Request, Response } from "express";
import * as service from "./notifications.service.js";

export const list = async (req: Request, res: Response) =>
  res.json(await service.list(req.auth!.sub, req.query as unknown as Parameters<typeof service.list>[1]));
export const unreadCount = async (req: Request, res: Response) =>
  res.json(await service.unreadCount(req.auth!.sub));
export const getOne = async (req: Request, res: Response) => {
  const row = await service.getById(req.auth!.sub, req.params.id);
  if (!row) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found" } });
  res.json(row);
};
export const markRead = async (req: Request, res: Response) => {
  await service.markRead(req.auth!.sub, req.params.id);
  res.status(204).end();
};
export const markAllRead = async (req: Request, res: Response) => {
  await service.markAllRead(req.auth!.sub);
  res.status(204).end();
};