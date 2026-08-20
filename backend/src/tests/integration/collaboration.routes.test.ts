/**
 * Integration tests for /api/v1/collaboration.
 *
 * The two things worth pinning here: the discriminated-union validator (a
 * placement body and a workshop body demand different fields, and neither
 * kind's fields satisfy the other), and the fact that nothing on this router is
 * public or member-writable beyond one's own request.
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { createPrismaDeepMock, makeToken, bearer } from "../helpers/integrationApp.js";

const prisma = createPrismaDeepMock();
jest.unstable_mockModule("../../lib/prisma.js", () => ({ prisma }));

const { buildApp } = await import("../../app.js");
const app = buildApp();

const userToken = makeToken({ sub: "user-1" });
const adminToken = makeToken({ sub: "admin-1", roles: ["ADMIN"] });

const PLACEMENT_BODY = {
  type: "PLACEMENT",
  title: "Infosys campus drive",
  organization: "Infosys",
  departments: ["Computer Science and Engineering"],
  candidatesRequired: 25,
  packageLpa: 6.5,
  driveDate: "2026-09-10",
  jobRole: "Systems Engineer",
};

const WORKSHOP_BODY = {
  type: "WORKSHOP",
  title: "Hands-on Kubernetes",
  subject: "Container orchestration",
  departments: [],
  durationValue: 2,
  durationUnit: "DAYS",
  startDate: "2026-09-10",
  endDate: "2026-09-11",
};

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "APPROVED" } as any);
});

describe("/collaboration", () => {
  it("401 anonymous list", async () => {
    const res = await request(app).get("/api/v1/collaboration");
    expect(res.status).toBe(401);
  });

  it("403 for a member whose account is not approved yet", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "PENDING" } as any);
    const res = await request(app)
      .get("/api/v1/collaboration")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 list", async () => {
    prisma.collaborationRequest.findMany.mockResolvedValueOnce([{ id: "c1" } as any]);
    prisma.collaborationRequest.count.mockResolvedValueOnce(1);
    const res = await request(app)
      .get("/api/v1/collaboration?type=PLACEMENT")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("201 create placement", async () => {
    prisma.collaborationRequest.create.mockResolvedValueOnce({ id: "c2" } as any);
    const res = await request(app)
      .post("/api/v1/collaboration")
      .set("Authorization", bearer(userToken))
      .send(PLACEMENT_BODY);
    expect(res.status).toBe(201);
    const created = prisma.collaborationRequest.create.mock.calls[0][0].data as any;
    expect(created).toMatchObject({ userId: "user-1" });
    // Status is never client-settable — the column default is what makes a new
    // request PENDING, so a body claiming APPROVED cannot smuggle one through.
    expect(created).not.toHaveProperty("status");
  });

  it("201 create workshop", async () => {
    prisma.collaborationRequest.create.mockResolvedValueOnce({ id: "c3" } as any);
    const res = await request(app)
      .post("/api/v1/collaboration")
      .set("Authorization", bearer(userToken))
      .send(WORKSHOP_BODY);
    expect(res.status).toBe(201);
  });

  it("422 placement missing the fields only a placement needs", async () => {
    const { candidatesRequired, packageLpa, ...rest } = PLACEMENT_BODY;
    const res = await request(app)
      .post("/api/v1/collaboration")
      .set("Authorization", bearer(userToken))
      .send(rest);
    expect(res.status).toBe(422);
  });

  it("422 workshop body sent as a placement", async () => {
    const res = await request(app)
      .post("/api/v1/collaboration")
      .set("Authorization", bearer(userToken))
      .send({ ...WORKSHOP_BODY, type: "PLACEMENT" });
    expect(res.status).toBe(422);
  });

  it("422 workshop ending before it starts", async () => {
    const res = await request(app)
      .post("/api/v1/collaboration")
      .set("Authorization", bearer(userToken))
      .send({ ...WORKSHOP_BODY, startDate: "2026-09-11", endDate: "2026-09-10" });
    expect(res.status).toBe(422);
  });

  it("422 an unknown department", async () => {
    const res = await request(app)
      .post("/api/v1/collaboration")
      .set("Authorization", bearer(userToken))
      .send({ ...PLACEMENT_BODY, departments: ["Made Up Engineering"] });
    expect(res.status).toBe(422);
  });

  it("403 reading another member's request", async () => {
    prisma.collaborationRequest.findUnique.mockResolvedValueOnce({
      id: "c1",
      userId: "someone-else",
    } as any);
    const res = await request(app)
      .get("/api/v1/collaboration/c1")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("403 when a member tries to moderate", async () => {
    const res = await request(app)
      .post("/api/v1/collaboration/c1/moderate")
      .set("Authorization", bearer(userToken))
      .send({ status: "APPROVED" });
    expect(res.status).toBe(403);
    expect(prisma.collaborationRequest.update).not.toHaveBeenCalled();
  });

  it("403 when a member asks for the admin pending counts", async () => {
    const res = await request(app)
      .get("/api/v1/collaboration/pending-counts")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(403);
  });

  it("200 admin moderation", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "admin-1", status: "APPROVED" } as any);
    prisma.collaborationRequest.findUnique.mockResolvedValueOnce({ id: "c1" } as any);
    prisma.collaborationRequest.update.mockResolvedValueOnce({
      id: "c1",
      userId: "user-1",
      type: "PLACEMENT",
      title: "Infosys campus drive",
      departments: [],
      status: "APPROVED",
      user: { id: "user-1", firstName: "Alice", lastName: "A", email: "alice@adcet.in" },
    } as any);
    const res = await request(app)
      .post("/api/v1/collaboration/c1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "APPROVED" });
    expect(res.status).toBe(200);
  });

  it("422 moderation with a status the workflow does not have", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "admin-1", status: "APPROVED" } as any);
    const res = await request(app)
      .post("/api/v1/collaboration/c1/moderate")
      .set("Authorization", bearer(adminToken))
      .send({ status: "PENDING" });
    expect(res.status).toBe(422);
  });

  it("204 withdrawing one's own pending request", async () => {
    prisma.collaborationRequest.findUnique.mockResolvedValueOnce({
      id: "c1",
      userId: "user-1",
      status: "PENDING",
    } as any);
    const res = await request(app)
      .delete("/api/v1/collaboration/c1")
      .set("Authorization", bearer(userToken));
    expect(res.status).toBe(204);
  });
});
