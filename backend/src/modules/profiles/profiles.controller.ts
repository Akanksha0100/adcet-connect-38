import type { Request, Response } from "express";
import * as service from "./profiles.service.js";

export const me = async (req: Request, res: Response) =>
  res.json(await service.getMyProfile(req.auth!.sub));

export const byUserId = async (req: Request, res: Response) =>
  res.json(await service.getProfileByUserId(req.params.userId));

export const updateMe = async (req: Request, res: Response) =>
  res.json(await service.updateMyProfile(req.auth!.sub, req.body));

export const addExperience = async (req: Request, res: Response) =>
  res.status(201).json(await service.addExperience(req.auth!.sub, req.body));
export const removeExperience = async (req: Request, res: Response) => {
  await service.removeExperience(req.params.id);
  res.status(204).end();
};

export const addEducation = async (req: Request, res: Response) =>
  res.status(201).json(await service.addEducation(req.auth!.sub, req.body));
export const removeEducation = async (req: Request, res: Response) => {
  await service.removeEducation(req.params.id);
  res.status(204).end();
};

export const setSkills = async (req: Request, res: Response) =>
  res.json(await service.setSkills(req.auth!.sub, req.body.skills));