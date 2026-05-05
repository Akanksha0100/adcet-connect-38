import type { Request, Response } from "express";
import type { AppRoleName } from "../../config/constants.js";
import * as service from "./admin.service.js";

export const listUsers = async (req: Request, res: Response) =>
  res.json(await service.listUsers(req.query as unknown as Parameters<typeof service.listUsers>[0]));

export const getUser = async (req: Request, res: Response) =>
  res.json(await service.getUserById(req.params.id));

export const setUserStatus = async (req: Request, res: Response) =>
  res.json(await service.setUserStatus(req.auth!.sub, req.params.id, req.body.status, req.body.reason));

export const assignRole = async (req: Request, res: Response) =>
  res.status(201).json(await service.assignRole(req.params.id, req.body.role));

export const revokeRole = async (req: Request, res: Response) => {
  await service.revokeRole(req.params.id, req.params.role as AppRoleName);
  res.status(204).end();
};

export const auditLog = async (req: Request, res: Response) =>
  res.json(await service.getAuditLog(req.query as unknown as Parameters<typeof service.getAuditLog>[0]));

export const generateReport = async (req: Request, res: Response) => {
  const result = await service.generateReport(req.body);
  if ("csv" in result) {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.body.type}-report.csv"`);
    return res.send(result.csv);
  }
  res.json(result);
};