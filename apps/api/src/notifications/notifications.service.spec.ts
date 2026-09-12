import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new NotificationsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("paginates unread notifications and returns the global unread count", async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: "notification-2" }]);
    prisma.notification.count.mockResolvedValueOnce(7).mockResolvedValueOnce(7);

    await expect(
      service.list("user-1", { page: 2, limit: 5, unreadOnly: true }),
    ).resolves.toEqual({
      data: [{ id: "notification-2" }],
      total: 7,
      unread: 7,
      page: 2,
      limit: 5,
      totalPages: 2,
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      orderBy: { createdAt: "desc" },
      skip: 5,
      take: 5,
    });
    expect(prisma.notification.count).toHaveBeenNthCalledWith(1, {
      where: { userId: "user-1", isRead: false },
    });
    expect(prisma.notification.count).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", isRead: false },
    });
  });

  it("transforms and validates notification query parameters", async () => {
    const query = plainToInstance(NotificationQueryDto, {
      page: "2",
      limit: "10",
      unreadOnly: "true",
    });

    expect(await validate(query)).toHaveLength(0);
    expect(query).toEqual({ page: 2, limit: 10, unreadOnly: true });
  });

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
