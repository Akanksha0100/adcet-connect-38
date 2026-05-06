/**
 * Branch + happy-path coverage for the profile service:
 * profile not-found errors on every related mutation, skill upsert + relink flow,
 * and the experience/education creation paths.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const svc = await import("../../../modules/profiles/profiles.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
});

describe("profiles.service — getMyProfile / getProfileByUserId", () => {
  it("404 when missing (mine)", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getMyProfile("u-1")).rejects.toMatchObject({ status: 404 });
  });
  it("404 when missing (byUserId)", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getProfileByUserId("u-1")).rejects.toMatchObject({ status: 404 });
  });
  it("returns profile when present", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce({ id: "p-1" });
    expect(await svc.getMyProfile("u-1")).toMatchObject({ id: "p-1" });
  });
});

describe("profiles.service — updateMyProfile", () => {
  it("upserts on userId", async () => {
    prismaMock.profile.upsert.mockResolvedValueOnce({});
    await svc.updateMyProfile("u-1", { city: "Pune" });
    expect((prismaMock.profile.upsert.mock.calls[0][0] as any).where).toEqual({ userId: "u-1" });
    expect((prismaMock.profile.upsert.mock.calls[0][0] as any).create).toMatchObject({
      userId: "u-1",
      city: "Pune",
    });
  });
});

describe("profiles.service — addExperience / addEducation", () => {
  it("addExperience: 404 when profile missing", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce(null);
    await expect(svc.addExperience("u-1", {})).rejects.toMatchObject({ status: 404 });
  });
  it("addExperience: links to profileId", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce({ id: "p-1" });
    prismaMock.workExperience.create.mockResolvedValueOnce({});
    await svc.addExperience("u-1", { company: "Acme" });
    expect((prismaMock.workExperience.create.mock.calls[0][0] as any).data.profileId).toBe("p-1");
  });
  it("removeExperience deletes by id", async () => {
    prismaMock.workExperience.delete.mockResolvedValueOnce({});
    await svc.removeExperience("e-1");
    expect(prismaMock.workExperience.delete).toHaveBeenCalledWith({ where: { id: "e-1" } });
  });
  it("addEducation: 404 when profile missing", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce(null);
    await expect(svc.addEducation("u-1", {})).rejects.toMatchObject({ status: 404 });
  });
  it("addEducation: links to profileId", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce({ id: "p-1" });
    prismaMock.education.create.mockResolvedValueOnce({});
    await svc.addEducation("u-1", { institute: "X" });
    expect((prismaMock.education.create.mock.calls[0][0] as any).data.profileId).toBe("p-1");
  });
  it("removeEducation deletes by id", async () => {
    prismaMock.education.delete.mockResolvedValueOnce({});
    await svc.removeEducation("e-1");
    expect(prismaMock.education.delete).toHaveBeenCalledWith({ where: { id: "e-1" } });
  });
});

describe("profiles.service — setSkills", () => {
  it("404 when profile missing", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce(null);
    await expect(svc.setSkills("u-1", ["js"])).rejects.toMatchObject({ status: 404 });
  });
  it("upserts each skill, clears existing links, then re-links", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce({ id: "p-1" });
    prismaMock.skill.upsert
      .mockResolvedValueOnce({ id: "s-1", name: "js" })
      .mockResolvedValueOnce({ id: "s-2", name: "ts" });
    prismaMock.profileSkill.deleteMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.profileSkill.createMany.mockResolvedValueOnce({ count: 2 });
    await svc.setSkills("u-1", ["js", "ts"]);
    expect(prismaMock.skill.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.profileSkill.deleteMany).toHaveBeenCalledWith({ where: { profileId: "p-1" } });
    expect((prismaMock.profileSkill.createMany.mock.calls[0][0] as any).data).toHaveLength(2);
  });
  it("empty skill list still resets the join table", async () => {
    prismaMock.profile.findUnique.mockResolvedValueOnce({ id: "p-1" });
    prismaMock.profileSkill.deleteMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.profileSkill.createMany.mockResolvedValueOnce({ count: 0 });
    await svc.setSkills("u-1", []);
    expect(prismaMock.profileSkill.deleteMany).toHaveBeenCalled();
    expect((prismaMock.profileSkill.createMany.mock.calls[0][0] as any).data).toEqual([]);
  });
});