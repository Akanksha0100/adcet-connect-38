import type { Request, Response } from "express";
import type { AppRoleName } from "../../config/constants.js";
import * as service from "./admin.service.js";
import { sendAdminMessage } from "../notifications/notifications.service.js";

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

export const exportPendingApprovals = async (req: Request, res: Response) =>
  res.json({
    items: await service.exportPendingApprovals(
      req.query as unknown as Parameters<typeof service.exportPendingApprovals>[0],
    ),
  });

export const importApprovalDecisions = async (req: Request, res: Response) =>
  res.json(await service.importApprovalDecisions(req.auth!.sub, req.body.decisions, req.body.reason));

export const auditLog = async (req: Request, res: Response) =>
  res.json(await service.getAuditLog(req.query as unknown as Parameters<typeof service.getAuditLog>[0]));

export const recentActivity = async (req: Request, res: Response) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit) || 12, 50) : 12;
  res.json({ items: await service.recentActivity(limit) });
};

export const generateReport = async (req: Request, res: Response) => {
  const result = await service.generateReport(req.body);
  if ("csv" in result) {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.body.type}-report.csv"`);
    return res.send(result.csv);
  }
  res.json(result);
};

export const messageUser = async (req: Request, res: Response) => {
  const row = await sendAdminMessage(req.auth!.sub, req.params.id, req.body.subject, req.body.body);
  res.status(201).json(row);
};

export const bulkSetUserStatus = async (req: Request, res: Response) =>
  res.json(await service.bulkSetUserStatus(req.auth!.sub, req.body.userIds, req.body.status, req.body.reason));