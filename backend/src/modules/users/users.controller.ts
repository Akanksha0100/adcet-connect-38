import type { Request, Response } from "express";
import * as service from "./users.service.js";

export const updateMe = async (req: Request, res: Response) => {
  const updated = await service.updateMe(req.auth!.sub, req.body);
  res.json({ id: updated.id, firstName: updated.firstName, lastName: updated.lastName });
};

export const getPreferences = async (req: Request, res: Response) => {
  res.json(await service.getPreferences(req.auth!.sub));
};

export const updatePreferences = async (req: Request, res: Response) => {
  res.json(await service.updatePreferences(req.auth!.sub, req.body));
};

export const changePassword = async (req: Request, res: Response) => {
  await service.changePassword(req.auth!.sub, req.body.currentPassword, req.body.newPassword);
  res.status(204).end();
};