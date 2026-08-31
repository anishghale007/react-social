import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifcations/notifications.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            follow: {
              findUnique: jest.fn(),
              create: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn((ops) => Promise.all(ops)),
          },
        },
        {
          provide: NotificationsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('throws ConflictException if email already exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'existing-user' }) // findByEmail
        .mockResolvedValueOnce(null); // findByUsername

      await expect(
        service.createUser({
          email: 'taken@test.com',
          username: 'newuser',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if username already exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // findByEmail
        .mockResolvedValueOnce({ id: 'existing-user' }); // findByUsername

      await expect(
        service.createUser({
          email: 'new@test.com',
          username: 'taken',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a user when email and username are both available', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        username: 'newuser',
        passwordHash: 'hashed',
      });

      const result = await service.createUser({
        email: 'new@test.com',
        username: 'newuser',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.email).toBe('new@test.com');
    });
  });

  describe('followUser', () => {
    it('throws ForbiddenException when following yourself', async () => {
      await expect(service.followUser('user-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('is idempotent if already following', async () => {
      prisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' });

      const result = await service.followUser('user-1', 'user-2');

      expect(prisma.follow.create).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(result).toEqual({ following: true });
    });

    it('creates a follow and notifies the target user', async () => {
      prisma.follow.findUnique.mockResolvedValue(null);
      prisma.follow.create.mockResolvedValue({});

      const result = await service.followUser('user-1', 'user-2');

      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'user-1', followingId: 'user-2' },
      });
      expect(notificationsService.create).toHaveBeenCalledWith({
        type: 'FOLLOW',
        recipientId: 'user-2',
        actorId: 'user-1',
      });
      expect(result).toEqual({ following: true });
    });
  });

  describe('unfollowUser', () => {
    it('removes the follow relationship', async () => {
      prisma.follow.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfollowUser('user-1', 'user-2');

      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: { followerId: 'user-1', followingId: 'user-2' },
      });
      expect(result).toEqual({ following: false });
    });
  });

  describe('getFollowStatus', () => {
    it('returns isFollowing true when a follow record exists', async () => {
      prisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' });
      prisma.follow.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);

      const result = await service.getFollowStatus('user-1', 'user-2');

      expect(result.isFollowing).toBe(true);
      expect(result.followerCount).toBe(5);
      expect(result.followingCount).toBe(3);
    });

    it('returns isFollowing false when no follow record exists', async () => {
      prisma.follow.findUnique.mockResolvedValue(null);
      prisma.follow.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.getFollowStatus('user-1', 'user-2');

      expect(result.isFollowing).toBe(false);
    });
  });

  describe('searchUsers', () => {
    it('excludes the searching user from results', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.searchUsers('john', 'searching-user-id');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'searching-user-id' },
          }),
        }),
      );
    });
  });
});
