import type { Request, Response } from "express";
import * as service from "./uploads.service.js";

export const presignUpload = async (req: Request, res: Response) =>
  res.json(await service.presignUpload(req.auth!.sub, req.body));

export const presignDownload = async (req: Request, res: Response) =>
  res.json({ url: await service.presignDownload(req.body.key) });

export const remove = async (req: Request, res: Response) => {
  await service.remove(req.body.key);
  res.status(204).end();
};