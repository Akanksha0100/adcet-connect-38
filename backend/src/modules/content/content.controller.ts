import type { Request, Response } from "express";
import * as service from "./content.service.js";

/* News */
export const listNews = async (req: Request, res: Response) =>
  res.json(await service.listNews(req.query as unknown as Parameters<typeof service.listNews>[0]));
export const createNews = async (req: Request, res: Response) =>
  res.status(201).json(await service.createNews(req.body));
export const updateNews = async (req: Request, res: Response) =>
  res.json(await service.updateNews(req.params.id, req.body));
export const deleteNews = async (req: Request, res: Response) => {
  await service.deleteNews(req.params.id);
  res.status(204).end();
};

/* Resources */
export const listResources = async (req: Request, res: Response) =>
  res.json(await service.listResources(req.query as unknown as Parameters<typeof service.listResources>[0]));
export const createResource = async (req: Request, res: Response) =>
  res.status(201).json(await service.createResource(req.body));
export const updateResource = async (req: Request, res: Response) =>
  res.json(await service.updateResource(req.params.id, req.body));
export const deleteResource = async (req: Request, res: Response) => {
  await service.deleteResource(req.params.id);
  res.status(204).end();
};

/* Support */
export const listSupport = async (req: Request, res: Response) =>
  res.json(await service.listSupport(req.query as unknown as Parameters<typeof service.listSupport>[0]));
export const submitSupport = async (req: Request, res: Response) =>
  res.status(201).json(
    await service.submitSupport({ ...req.body, userId: req.auth?.sub }),
  );
export const resolveSupport = async (req: Request, res: Response) =>
  res.json(await service.resolveSupport(req.params.id, req.body?.resolved !== false));
export const deleteSupport = async (req: Request, res: Response) => {
  await service.deleteSupport(req.params.id);
  res.status(204).end();
};

/* Site sections */
export const listSections = async (_req: Request, res: Response) =>
  res.json(await service.listSections());
export const getSection = async (req: Request, res: Response) => {
  const s = await service.getSection(req.params.key);
  res.json(s ?? null);
};
export const upsertSection = async (req: Request, res: Response) =>
  res.json(await service.upsertSection(req.params.key, req.body));