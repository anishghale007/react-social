import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn((ops) => Promise.all(ops)),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('does NOT create a notification if recipient and actor are the same user', async () => {
      const result = await service.create({
        type: 'LIKE',
        recipientId: 'user-1',
        actorId: 'user-1',
        postId: 'post-1',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('creates a notification when recipient and actor differ', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.create({
        type: 'FOLLOW',
        recipientId: 'user-1',
        actorId: 'user-2',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { type: 'FOLLOW', recipientId: 'user-1', actorId: 'user-2' },
      });
      expect(result).toEqual({ id: 'notif-1' });
    });
  });

  describe('getForUser', () => {
    it('returns notifications with pagination meta and unread count', async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: 'notif-1' }]);
      prisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const result = await service.getForUser('user-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(10);
      expect(result.meta.unreadCount).toBe(3);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
