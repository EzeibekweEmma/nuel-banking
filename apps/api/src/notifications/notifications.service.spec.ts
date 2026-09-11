import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const prisma = { notification: { updateMany: jest.fn() } };
  const service = new NotificationsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("marks every unread notification belonging to the customer as read", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });

    await expect(service.markAllRead("user-1")).resolves.toEqual({
      updated: 4,
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      data: { isRead: true },
    });
  });
});
