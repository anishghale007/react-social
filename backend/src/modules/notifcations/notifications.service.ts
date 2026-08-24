import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly actorSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
  };

  async create(params: {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    postId?: string;
  }) {
    // Don't notify yourself (e.g. liking/commenting on your own post)
    if (params.recipientId === params.actorId) return null;

    return this.prisma.notification.create({
      data: params,
    });
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        include: {
          actor: { select: this.actorSelect },
          post: { select: { id: true, content: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { recipientId: userId } }),
      this.prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
    return { count };
  }
}
