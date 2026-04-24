import type { Request, Response } from "express";
import * as service from "./geo.service.js";

export const cities = async (_req: Request, res: Response) => res.json(await service.cities());
export const companies = async (_req: Request, res: Response) => res.json(await service.companies());
export const cityCompanyBreakdown = async (_req: Request, res: Response) =>
  res.json(await service.cityCompanyBreakdown());