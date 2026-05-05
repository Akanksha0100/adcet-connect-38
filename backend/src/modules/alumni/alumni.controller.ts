import type { Request, Response } from "express";
import * as service from "./alumni.service.js";

export const search = async (req: Request, res: Response) =>
  res.json(await service.search(req.query as unknown as Parameters<typeof service.search>[0]));