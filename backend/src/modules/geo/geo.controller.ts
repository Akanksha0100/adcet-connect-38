import type { Request, Response } from "express";
import * as service from "./geo.service.js";

export const cities = async (_req: Request, res: Response) => res.json(await service.cities());
export const publicCities = async (_req: Request, res: Response) => res.json(await service.publicCities());
export const companies = async (_req: Request, res: Response) => res.json(await service.companies());
export const cityCompanyBreakdown = async (_req: Request, res: Response) =>
  res.json(await service.cityCompanyBreakdown());

/**
 * Pre-aggregated points for the alumni map. Served from a short cache and
 * identical for anonymous and signed-in callers, so the same handler backs both
 * the public page and the in-portal one.
 */
export const alumniMap = async (_req: Request, res: Response) =>
  res.json(await service.alumniMapCached());