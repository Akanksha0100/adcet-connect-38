import type { Request, Response } from "express";
import { BadRequest } from "../../lib/errors.js";
import * as service from "./uploads.service.js";

export const presignUpload = async (req: Request, res: Response) =>
  res.json(await service.presignUpload(req.auth!.sub, req.body));

export const uploadDirect = async (req: Request, res: Response) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw BadRequest("Upload body is required");
  }
  res.status(201).json(await service.uploadDirect(req.auth!.sub, {
    fileName: String(req.query.fileName),
    contentType: String(req.query.contentType),
    scope: req.query.scope as Parameters<typeof service.uploadDirect>[1]["scope"],
    body: req.body,
  }));
};

export const presignDownload = async (req: Request, res: Response) =>
  res.json({ url: await service.presignDownload(req.body.key) });

export const remove = async (req: Request, res: Response) => {
  await service.remove(req.body.key);
  res.status(204).end();
};
