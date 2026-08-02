import type { Request, Response } from "express";
import * as service from "./chapters.service.js";

/** Public list. Archived chapters are only ever revealed to admins. */
export const list = async (req: Request, res: Response) => {
  const wantsInactive = (req.query as { includeInactive?: boolean }).includeInactive === true;
  const isAdmin = !!req.auth?.roles.includes("ADMIN");
  res.json(await service.list({ includeInactive: wantsInactive && isAdmin }));
};

export const getBySlug = async (req: Request, res: Response) =>
  res.json(await service.getBySlug(req.params.slug));

export const getMine = async (req: Request, res: Response) =>
  res.json({ chapter: await service.getMine(req.auth!.sub) });

export const create = async (req: Request, res: Response) =>
  res.status(201).json(await service.create(req.auth!.sub, req.body));

export const update = async (req: Request, res: Response) =>
  res.json(await service.update(req.auth!.sub, req.params.id, req.body));

export const remove = async (req: Request, res: Response) => {
  await service.remove(req.auth!.sub, req.params.id);
  res.status(204).end();
};

export const listMembers = async (req: Request, res: Response) =>
  res.json(
    await service.listMembers(
      req.params.id,
      req.query as unknown as Parameters<typeof service.listMembers>[1],
    ),
  );

export const removeMember = async (req: Request, res: Response) =>
  res.json(await service.removeMember(req.auth!.sub, req.params.id, req.params.userId));

/* ------------------------------- invitations ------------------------------ */

export const invite = async (req: Request, res: Response) => {
  const result = await service.invite(req.auth!.sub, req.params.id, req.body.userId, req.body.message);
  // Deliver out-of-band: a mail hiccup must not fail an invitation that is
  // already recorded and visible in the portal.
  void service.sendInvitationEmail(result);
  res.status(201).json(result.invitation);
};

export const cancelInvitation = async (req: Request, res: Response) =>
  res.json(await service.cancelInvitation(req.auth!.sub, req.params.invitationId));

export const listInvitations = async (req: Request, res: Response) =>
  res.json(await service.listInvitations(req.params.id));

export const myInvitations = async (req: Request, res: Response) =>
  res.json(await service.myInvitations(req.auth!.sub));

export const respondToInvitation = async (req: Request, res: Response) => {
  const { invitation } = await service.respondToInvitation(
    req.auth!.sub,
    req.params.invitationId,
    req.body.response,
  );
  res.json(invitation);
};

/** Public one-click accept/decline from the invitation email — token-based. */
export const emailRespond = async (req: Request, res: Response) => {
  const { token, response } = req.query as { token: string; response: "ACCEPT" | "DECLINE" };
  const html = await service.handleEmailInvitationResponse(token, response);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
};
