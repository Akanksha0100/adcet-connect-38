import type { Request, Response } from "express";
import * as service from "./gallery.service.js";
import { isAdmin } from "../../middlewares/rbac.js";

/** Only an admin may ask for unpublished albums, whatever the query says. */
export const listAlbums = async (req: Request, res: Response) => {
  const wants = (req.query as { includeUnpublished?: boolean }).includeUnpublished === true;
  res.json(await service.listAlbums({ includeUnpublished: wants && isAdmin(req) }));
};

export const createAlbum = async (req: Request, res: Response) =>
  res.status(201).json(await service.createAlbum(req.body));

export const updateAlbum = async (req: Request, res: Response) =>
  res.json(await service.updateAlbum(req.params.id, req.body));

export const deleteAlbum = async (req: Request, res: Response) => {
  await service.deleteAlbum(req.params.id);
  res.status(204).end();
};

export const addPhotos = async (req: Request, res: Response) =>
  res.status(201).json(await service.addPhotos(req.params.id, req.body.imageKeys));

export const deletePhoto = async (req: Request, res: Response) => {
  await service.deletePhoto(req.params.photoId);
  res.status(204).end();
};
