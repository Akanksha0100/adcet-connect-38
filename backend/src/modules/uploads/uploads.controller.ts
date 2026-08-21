import type { Request, Response } from "express";
import { BadRequest } from "../../lib/errors.js";
import { isAdmin } from "../../middlewares/rbac.js";
import * as service from "./uploads.service.js";

/** The identity every key check is made against. */
const caller = (req: Request): service.Caller => ({ id: req.auth!.sub, isAdmin: isAdmin(req) });

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
  res.json({ url: await service.presignDownload(caller(req), req.body.key) });

export const remove = async (req: Request, res: Response) => {
  await service.remove(caller(req), req.body.key);
  res.status(204).end();
};
