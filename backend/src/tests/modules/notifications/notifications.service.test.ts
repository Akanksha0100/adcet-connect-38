import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createPrismaMock } from "../../helpers/prismaMock.js";

const prismaMock = createPrismaMock();
jest.unstable_mockModule("../../../lib/prisma.js", () => ({ prisma: prismaMock }));
const sendEmailMock = jest.fn(async () => undefined);
jest.unstable_mockModule("../../../lib/mailer.js", () => ({ sendEmail: sendEmailMock }));

const svc = await import("../../../modules/notifications/notifications.service.js");

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    m && typeof m === "object" ? Object.values(m).forEach((fn: any) => fn?.mockReset?.()) : null,
  );
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(undefined);
});

describe("modules/notifications/service", () => {
  it("list: returns items + pagination + unread count", async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([{ id: "n-1" }]);
    prismaMock.notification.count
      .mockResolvedValueOnce(1) // total
      .mockResolvedValueOnce(1); // unread
    const out = await svc.list("u-1", { page: 1, pageSize: 10 } as any);
    expect(out).toMatchObject({
      items: [{ id: "n-1" }],
      pagination: { total: 1 },
      unread: 1,
    });
  });

  it("unreadCount returns the count for the user", async () => {
    prismaMock.notification.count.mockResolvedValueOnce(7);
    expect(await svc.unreadCount("u-1")).toEqual({ unread: 7 });
  });

  it("markRead only touches notifications belonging to the caller", async () => {
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 1 });
    await svc.markRead("u-1", "n-1");
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "u-1" },
      data: { readAt: expect.any(Date) },
    });
  });

  it("notify: inserts a row in-app and skips email when sendEmailToo is false", async () => {
    prismaMock.notification.create.mockResolvedValueOnce({});
    await svc.notify("u-1", { type: "x", title: "hello" });
    expect(prismaMock.notification.create).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("notify: respects user's notificationsEmail=false preference", async () => {
    prismaMock.notification.create.mockResolvedValueOnce({});
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", email: "a@b" });
    prismaMock.userPreferences.findUnique.mockResolvedValueOnce({ notificationsEmail: false });
    await svc.notify("u-1", { type: "x", title: "hello", sendEmailToo: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("notify: sends email when prefs allow it", async () => {
    prismaMock.notification.create.mockResolvedValueOnce({});
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u-1", email: "a@b" });
    prismaMock.userPreferences.findUnique.mockResolvedValueOnce({ notificationsEmail: true });
    await svc.notify("u-1", { type: "x", title: "Hello", body: "Body!", sendEmailToo: true });
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: "a@b",
      subject: "Hello",
      text: "Body!",
    });
  });

  it("notify: never throws even if DB insert fails (logs & continues)", async () => {
    prismaMock.notification.create.mockRejectedValueOnce(new Error("db down"));
    await expect(svc.notify("u-1", { type: "x", title: "t" })).resolves.toBeUndefined();
  });
});