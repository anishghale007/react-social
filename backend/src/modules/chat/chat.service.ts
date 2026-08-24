import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
  };

  async findOrCreateConversation(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new ForbiddenException('Cannot start a conversation with yourself');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: recipientId } } },
        ],
      },
      include: {
        members: { include: { user: { select: this.userSelect } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        isGroup: false,
        members: { create: [{ userId }, { userId: recipientId }] },
      },
      include: {
        members: { include: { user: { select: this.userSelect } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: this.userSelect } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conversation) => {
      const myMembership = conversation.members.find(
        (m) => m.userId === userId,
      );
      const lastMessage = conversation.messages[0];

      const isUnread = Boolean(
        lastMessage &&
        lastMessage.senderId !== userId && // don't count your own messages as unread
        (!myMembership?.lastReadAt ||
          lastMessage.createdAt > myMembership.lastReadAt),
      );

      return { ...conversation, isUnread };
    });
  }

  async assertMembership(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('Not a member of this conversation');
    return membership;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 30,
  ) {
    await this.assertMembership(conversationId, userId);

    const skip = (page - 1) * limit;
    const [messages, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        include: { sender: { select: this.userSelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: { conversationId, isDeleted: false },
      }),
    ]);

    return {
      data: messages.reverse(),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ) {
    await this.assertMembership(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
      include: { sender: { select: this.userSelect } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.assertMembership(conversationId, userId);

    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  }
}
