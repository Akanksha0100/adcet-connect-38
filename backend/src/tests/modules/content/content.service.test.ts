import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const sendEmailMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../lib/mailer.js", () => ({ sendEmail: sendEmailMock }));

const svc = await import("../../../modules/content/content.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(undefined);
});

describe("modules/content/service — News", () => {
  it("listNews paginates by publishedAt desc", async () => {
    prismaMock.newsItem.findMany.mockResolvedValueOnce([{ id: "n-1" }]);
    prismaMock.newsItem.count.mockResolvedValueOnce(1);
    const out = await svc.listNews({ page: 1, pageSize: 10 } as any);
    expect(out.items).toHaveLength(1);
    expect(prismaMock.newsItem.findMany.mock.calls[0][0]).toMatchObject({
      orderBy: { publishedAt: "desc" },
    });
  });

  it("updateNews: 404 when news item missing", async () => {
    prismaMock.newsItem.findUnique.mockResolvedValueOnce(null);
    await expect(svc.updateNews("missing", { title: "x" } as any)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("deleteNews swallows missing-row errors", async () => {
    prismaMock.newsItem.delete.mockRejectedValueOnce(new Error("nope"));
    await expect(svc.deleteNews("missing")).resolves.toBeUndefined();
  });
});

describe("modules/content/service — Resources", () => {
  it("createResource forwards link + category", async () => {
    prismaMock.resourceItem.create.mockResolvedValueOnce({});
    await svc.createResource({ title: "T", body: "B", link: "https://x", category: "Docs" });
    expect(prismaMock.resourceItem.create).toHaveBeenCalledWith({
      data: { title: "T", body: "B", link: "https://x", category: "Docs" },
    });
  });
});

describe("modules/content/service — Support", () => {
  it("submitSupport persists message and best-effort emails ops", async () => {
    prismaMock.supportMessage.create.mockResolvedValueOnce({
      id: "s-1",
      name: "Bob",
      email: "b@x",
      message: "Help",
      subject: "Issue",
    });
    await svc.submitSupport({ name: "Bob", email: "b@x", message: "Help", subject: "Issue" });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("Issue") }),
    );
  });

  it("submitSupport does not throw if email transport fails", async () => {
    prismaMock.supportMessage.create.mockResolvedValueOnce({ id: "s-1", name: "B", email: "b@x", message: "x" });
    sendEmailMock.mockRejectedValueOnce(new Error("smtp down"));
    await expect(
      svc.submitSupport({ name: "B", email: "b@x", message: "x" }),
    ).resolves.toBeDefined();
  });

  it("resolveSupport: 404 if message missing", async () => {
    prismaMock.supportMessage.findUnique.mockResolvedValueOnce(null);
    await expect(svc.resolveSupport("missing", true)).rejects.toMatchObject({ status: 404 });
  });

  it("resolveSupport sets resolvedAt to a Date when resolved=true and null otherwise", async () => {
    prismaMock.supportMessage.findUnique.mockResolvedValue({ id: "s-1" });
    prismaMock.supportMessage.update.mockResolvedValue({});
    await svc.resolveSupport("s-1", true);
    expect((prismaMock.supportMessage.update.mock.calls[0][0] as any).data.resolvedAt).toBeInstanceOf(Date);
    await svc.resolveSupport("s-1", false);
    expect((prismaMock.supportMessage.update.mock.calls[1][0] as any).data.resolvedAt).toBeNull();
  });
});

describe("modules/content/service — SiteSection", () => {
  it("upsertSection upserts by key", async () => {
    prismaMock.siteSection.upsert.mockResolvedValueOnce({});
    await svc.upsertSection("about", { title: "About", body: "Hello" });
    expect(prismaMock.siteSection.upsert).toHaveBeenCalledWith({
      where: { key: "about" },
      update: { title: "About", body: "Hello" },
      create: { key: "about", title: "About", body: "Hello" },
    });
  });
});