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

/* Newsletters */
export const listNewsletters = async (req: Request, res: Response) =>
  res.json(await service.listNewsletters(req.query as unknown as Parameters<typeof service.listNewsletters>[0]));
export const createNewsletter = async (req: Request, res: Response) =>
  res.status(201).json(await service.createNewsletter(req.body));
export const updateNewsletter = async (req: Request, res: Response) =>
  res.json(await service.updateNewsletter(req.params.id, req.body));
export const deleteNewsletter = async (req: Request, res: Response) => {
  await service.deleteNewsletter(req.params.id);
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