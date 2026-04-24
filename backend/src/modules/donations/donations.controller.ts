import type { Request, Response } from "express";
import * as service from "./donations.service.js";

export const listCampaigns = async (req: Request, res: Response) =>
  res.json(await service.listCampaigns(req.query as any));
export const getCampaign = async (req: Request, res: Response) =>
  res.json(await service.getCampaign(req.params.id));
export const createCampaign = async (req: Request, res: Response) =>
  res.status(201).json(await service.createCampaign(req.body));
export const updateCampaign = async (req: Request, res: Response) =>
  res.json(await service.updateCampaign(req.params.id, req.body));
export const deleteCampaign = async (req: Request, res: Response) => {
  await service.deleteCampaign(req.params.id);
  res.status(204).end();
};
export const pledge = async (req: Request, res: Response) =>
  res.status(201).json(await service.pledge(req.auth!.sub, req.body));
export const listDonations = async (req: Request, res: Response) =>
  res.json(await service.listDonations(req.query as any));
export const myDonations = async (req: Request, res: Response) =>
  res.json(await service.myDonations(req.auth!.sub));
export const updateDonationStatus = async (req: Request, res: Response) =>
  res.json(await service.updateDonationStatus(req.params.id, req.body));