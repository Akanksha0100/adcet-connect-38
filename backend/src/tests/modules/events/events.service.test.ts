import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));

const svc = await import("../../../modules/events/events.service.js");
const ALUMNI = { sub: "u-1", roles: ["ALUMNI"] as any };
const ADMIN = { sub: "admin-1", roles: ["ADMIN"] as any };

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object"
      ? Object.values(m).forEach((fn: any) => fn?.mockReset?.())
      : null,
  );
});

describe("list", () => {
  it("non-admin sees only APPROVED events", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5 } as any, ALUMNI);
    expect((prismaMock.event.findMany.mock.calls[0][0] as any).where.status).toBe("APPROVED");
  });

  it("admin without status filter sees all (no status clause)", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5 } as any, ADMIN);
    expect((prismaMock.event.findMany.mock.calls[0][0] as any).where.status).toBeUndefined();
  });

  it("upcoming filter applies startsAt >= now", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5, upcoming: true } as any, ALUMNI);
    expect((prismaMock.event.findMany.mock.calls[0][0] as any).where.startsAt.gte).toBeInstanceOf(Date);
  });

  it("free-text q builds OR clause", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5, q: "reunion" } as any, ALUMNI);
    const where = (prismaMock.event.findMany.mock.calls[0][0] as any).where;
    expect(where.OR).toHaveLength(2);
  });

  it("anonymous caller defaults to APPROVED", async () => {
    prismaMock.event.findMany.mockResolvedValueOnce([]);
    prismaMock.event.count.mockResolvedValueOnce(0);
    await svc.list({ page: 1, pageSize: 5 } as any);
    expect((prismaMock.event.findMany.mock.calls[0][0] as any).where.status).toBe("APPROVED");
  });
});

describe("getById", () => {
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

describe("create (admin-only; auto-APPROVED)", () => {
  it("sets status=APPROVED and wires createdById from caller", async () => {
    prismaMock.event.create.mockResolvedValueOnce({});
    await svc.create(ADMIN, { title: "T" } as any);
    const data = (prismaMock.event.create.mock.calls[0][0] as any).data;
    expect(data.createdById).toBe("admin-1");
    expect(data.status).toBe("APPROVED");
  });
});

describe("update (admin-only)", () => {
  it("404 when event missing", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce(null);
    await expect(svc.update(ADMIN, "missing", {} as any)).rejects.toMatchObject({ status: 404 });
  });

  it("403 when caller is not admin", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "u-1" });
    await expect(svc.update(ALUMNI, "e-1", {} as any)).rejects.toMatchObject({ status: 403 });
  });

  it("admin can update any event", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "other" });
    prismaMock.event.update.mockResolvedValueOnce({ id: "e-1" });
    await svc.update(ADMIN, "e-1", { title: "X" } as any);
    expect(prismaMock.event.update).toHaveBeenCalled();
  });
});

describe("remove (admin-only)", () => {
  it("404 when event missing", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce(null);
    await expect(svc.remove(ADMIN, "missing")).rejects.toMatchObject({ status: 404 });
  });

  it("403 when caller is not admin", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "u-1" });
    await expect(svc.remove(ALUMNI, "e-1")).rejects.toMatchObject({ status: 403 });
  });

  it("admin can remove any event", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "other" });
    prismaMock.event.delete.mockResolvedValueOnce({});
    await expect(svc.remove(ADMIN, "e-1")).resolves.toBeUndefined();
  });
});

describe("rsvp", () => {
  it("upserts on (event, user) compound key with provided status", async () => {
    prismaMock.eventRsvp.upsert.mockResolvedValueOnce({});
    await svc.rsvp("e-1", "u-1", "INTERESTED");
    const arg = prismaMock.eventRsvp.upsert.mock.calls[0][0] as any;
    expect(arg.where).toEqual({ eventId_userId: { eventId: "e-1", userId: "u-1" } });
    expect(arg.update.status).toBe("INTERESTED");
    expect(arg.create.status).toBe("INTERESTED");
  });
});

describe("listRsvps (admin-only)", () => {
  it("404 when event missing", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce(null);
    await expect(svc.listRsvps(ADMIN, "e-1")).rejects.toMatchObject({ status: 404 });
  });

  it("403 for non-admin", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "u-1" });
    await expect(svc.listRsvps(ALUMNI, "e-1")).rejects.toMatchObject({ status: 403 });
  });

  it("admin can list with user include", async () => {
    prismaMock.event.findUnique.mockResolvedValueOnce({ id: "e-1", createdById: "other" });
    prismaMock.eventRsvp.findMany.mockResolvedValueOnce([]);
    await svc.listRsvps(ADMIN, "e-1");
    expect((prismaMock.eventRsvp.findMany.mock.calls[0][0] as any).include.user).toBeDefined();
  });
});
