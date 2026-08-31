import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            conversationMember: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            message: {
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn((ops) => Promise.all(ops)),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateConversation', () => {
    it('throws ForbiddenException when messaging yourself', async () => {
      await expect(
        service.findOrCreateConversation('user-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns an existing conversation if one already exists', async () => {
      const existing = { id: 'convo-1', isGroup: false, members: [] };
      prisma.conversation.findFirst.mockResolvedValue(existing);

      const result = await service.findOrCreateConversation('user-1', 'user-2');

      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('creates a new conversation if none exists', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      const created = { id: 'convo-2', isGroup: false, members: [] };
      prisma.conversation.create.mockResolvedValue(created);

      const result = await service.findOrCreateConversation('user-1', 'user-2');

      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isGroup: false,
            members: { create: [{ userId: 'user-1' }, { userId: 'user-2' }] },
          }),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('assertMembership', () => {
    it('throws ForbiddenException if user is not a member', async () => {
      prisma.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.assertMembership('convo-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns the membership record if user is a member', async () => {
      const membership = {
        id: 'member-1',
        conversationId: 'convo-1',
        userId: 'user-1',
      };
      prisma.conversationMember.findUnique.mockResolvedValue(membership);

      const result = await service.assertMembership('convo-1', 'user-1');
      expect(result).toEqual(membership);
    });
  });

  describe('getMessages', () => {
    it('throws ForbiddenException if requester is not a member', async () => {
      prisma.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('convo-1', 'not-a-member'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns paginated messages in chronological order for a member', async () => {
      prisma.conversationMember.findUnique.mockResolvedValue({
        id: 'member-1',
      });
      // Service reverses the desc-fetched page to chronological order
      prisma.message.findMany.mockResolvedValue([
        { id: 'msg-2', createdAt: new Date('2026-01-02') },
        { id: 'msg-1', createdAt: new Date('2026-01-01') },
      ]);
      prisma.message.count.mockResolvedValue(2);

      const result = await service.getMessages('convo-1', 'user-1');

      expect(result.data[0].id).toBe('msg-1'); // oldest first after reverse
      expect(result.data[1].id).toBe('msg-2');
      expect(result.meta.total).toBe(2);
    });
  });

  describe('createMessage', () => {
    it('throws ForbiddenException if sender is not a member', async () => {
      prisma.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createMessage('convo-1', 'not-a-member', 'Hello'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates the message and bumps conversation updatedAt', async () => {
      prisma.conversationMember.findUnique.mockResolvedValue({
        id: 'member-1',
      });
      const created = {
        id: 'msg-1',
        content: 'Hello',
        conversationId: 'convo-1',
      };
      prisma.message.create.mockResolvedValue(created);
      prisma.conversation.update.mockResolvedValue({});

      const result = await service.createMessage('convo-1', 'user-1', 'Hello');

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            conversationId: 'convo-1',
            senderId: 'user-1',
            content: 'Hello',
          },
        }),
      );
      expect(prisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'convo-1' } }),
      );
      expect(result).toEqual(created);
    });
  });
});
