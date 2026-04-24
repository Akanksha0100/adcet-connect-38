import type { Request, Response } from "express";
import * as service from "./analytics.service.js";

export const overview = async (_req: Request, res: Response) => res.json(await service.overview());
export const alumniByYear = async (_req: Request, res: Response) =>
  res.json(await service.alumniByYear());
export const departmentBreakdown = async (_req: Request, res: Response) =>
  res.json(await service.departmentBreakdown());
export const adminOverview = async (_req: Request, res: Response) =>
  res.json(await service.adminOverview());