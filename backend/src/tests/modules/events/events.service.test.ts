import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const notifyMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../modules/notifications/notifications.service.js", () => ({
  notify: notifyMock,
  create: jest.fn(),
}));

const svc = await import("../../../modules/events/events.service.js");
const ALUMNI = { sub: "u-1", roles: ["ALUMNI"] as any };
const ADMIN = { sub: "admin-1", roles: ["ADMIN"] as any };

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  notifyMock.mockClear();
});

describe("modules/events/service — list", () => {
  it("non-admin only sees APPROVED events by default", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5 } as any, ALUMNI);
    expect((prismaMock.event.findMany.mock.calls[0][0] as any).where.status).toBe("APPROVED");
  });

  it("upcoming filter applies startsAt >= now", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5, upcoming: true } as any, ALUMNI);
    expect((prismaMock.event.findMany.mock.calls[0][0] as any).where.startsAt.gte).toBeInstanceOf(Date);
  });
});

describe("modules/events/service — moderate", () => {
  it("APPROVED notifies the organiser", async () => {
    prismaMock.event.update.mockResolvedValueOnce({
      id: "e-1",
      title: "Reunion",
      createdById: "u-1",
    });
    await svc.moderate("e-1", "APPROVED");
    expect(notifyMock).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ type: "event.approved" }),
    );
  });

  it("REJECTED stores rejectionReason and includes it in the email body", async () => {
    prismaMock.event.update.mockResolvedValueOnce({
      id: "e-1",
      title: "x",
      createdById: "u-1",
    });
    await svc.moderate("e-1", "REJECTED", "Off-topic");
    expect((prismaMock.event.update.mock.calls[0][0] as any).data.rejectionReason).toBe("Off-topic");
    expect(notifyMock.mock.calls[0][1].body).toContain("Off-topic");
  });
});

describe("modules/events/service — rsvp", () => {
  it("upserts on (event, user) compound key with provided status", async () => {
    prismaMock.eventRsvp.upsert.mockResolvedValueOnce({});
    await svc.rsvp("e-1", "u-1", "INTERESTED");
    const arg = prismaMock.eventRsvp.upsert.mock.calls[0][0] as any;
    expect(arg.where).toEqual({ eventId_userId: { eventId: "e-1", userId: "u-1" } });
    expect(arg.update.status).toBe("INTERESTED");
    expect(arg.create.status).toBe("INTERESTED");
  });
});

describe("modules/events/service — getById", () => {
  it("404 when event missing", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getById("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("includes createdBy", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1" });
    await svc.getById("e-1");
    expect((prismaMock.event.findUnique.mock.calls[0][0] as any).include.createdBy).toBeDefined();
  });
});

describe("modules/events/service — ownership on update/remove", () => {
  it("update 403 when non-owner non-admin", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "other" });
    await expect(svc.update(ALUMNI, "e-1", {} as any)).rejects.toMatchObject({ status: 403 });
  });
  it("remove allowed for admin even when not owner", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "other" });
    prismaMock.event.delete.mockResolvedValueOnce({});
    await expect(svc.remove(ADMIN, "e-1")).resolves.toBeUndefined();
  });
});