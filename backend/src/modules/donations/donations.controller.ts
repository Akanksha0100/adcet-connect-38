import type { Request, Response } from "express";
import * as service from "./donations.service.js";

export const listCampaigns = async (req: Request, res: Response) =>
  res.json(await service.listCampaigns(req.query as unknown as Parameters<typeof service.listCampaigns>[0]));
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
export const createOrder = async (req: Request, res: Response) =>
  res.status(201).json(await service.createOrder(req.auth!.sub, req.body));
export const verifyPayment = async (req: Request, res: Response) =>
  res.json(await service.verifyPayment(req.auth!.sub, req.body));
export const webhook = async (req: Request, res: Response) => {
  const rawBody: Buffer = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from("");
  const signature = req.header("x-razorpay-signature");
  res.json(await service.handleWebhook(rawBody, signature));
};
export const listDonations = async (req: Request, res: Response) =>
  res.json(await service.listDonations(req.query as unknown as Parameters<typeof service.listDonations>[0]));
export const myDonations = async (req: Request, res: Response) =>
  res.json(await service.myDonations(req.auth!.sub));
export const updateDonationStatus = async (req: Request, res: Response) =>
  res.json(await service.updateDonationStatus(req.auth!.sub, req.params.id, req.body));
