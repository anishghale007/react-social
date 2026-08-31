import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifcations/notifications.service';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: any;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockPost = {
    id: 'post-1',
    content: 'Hello world',
    authorId: 'user-1',
    isDeleted: false,
    author: { id: 'user-1', username: 'testuser' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: {
            post: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            like: {
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            comment: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            follow: {
              findMany: jest.fn(),
            },
            $transaction: jest.fn((ops) => Promise.all(ops)),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('throws NotFoundException if post does not exist', async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the post if found', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);

      const result = await service.findOne('post-1');
      expect(result).toEqual(mockPost);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException if user is not the author', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);

      await expect(
        service.update('post-1', 'different-user', { content: 'edited' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates the post if user is the author', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);
      prisma.post.update.mockResolvedValue({ ...mockPost, content: 'edited' });

      const result = await service.update('post-1', 'user-1', {
        content: 'edited',
      });

      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post-1' },
          data: { content: 'edited' },
        }),
      );
      expect(result.content).toBe('edited');
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException if user is not the author', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);

      await expect(service.remove('post-1', 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('soft-deletes the post if user is the author', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);
      prisma.post.update.mockResolvedValue({ ...mockPost, isDeleted: true });

      const result = await service.remove('post-1', 'user-1');

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { isDeleted: true },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('toggleLike', () => {
    it('creates a like and notifies the author if not already liked', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.like.create.mockResolvedValue({});

      const result = await service.toggleLike('post-1', 'user-2');

      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { postId: 'post-1', userId: 'user-2' },
      });
      expect(notificationsService.create).toHaveBeenCalledWith({
        type: 'LIKE',
        recipientId: 'user-1',
        actorId: 'user-2',
        postId: 'post-1',
      });
      expect(result).toEqual({ liked: true });
    });

    it('removes the like if already liked (unlike)', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);
      prisma.like.findUnique.mockResolvedValue({ id: 'like-1' });
      prisma.like.delete.mockResolvedValue({});

      const result = await service.toggleLike('post-1', 'user-2');

      expect(prisma.like.delete).toHaveBeenCalledWith({
        where: { id: 'like-1' },
      });
      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(result).toEqual({ liked: false });
    });
  });

  describe('createComment', () => {
    it('creates a comment and notifies the post author', async () => {
      prisma.post.findFirst.mockResolvedValue(mockPost);
      prisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        content: 'Nice post!',
        postId: 'post-1',
        authorId: 'user-2',
      });

      const result = await service.createComment(
        'post-1',
        'user-2',
        'Nice post!',
      );

      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { postId: 'post-1', authorId: 'user-2', content: 'Nice post!' },
        }),
      );
      expect(notificationsService.create).toHaveBeenCalledWith({
        type: 'COMMENT',
        recipientId: 'user-1',
        actorId: 'user-2',
        postId: 'post-1',
      });
      expect(result.content).toBe('Nice post!');
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundException if comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteComment('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the comment author', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
        isDeleted: false,
      });

      await expect(
        service.deleteComment('comment-1', 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('soft-deletes the comment if user is the author', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
        isDeleted: false,
      });
      prisma.comment.update.mockResolvedValue({});

      const result = await service.deleteComment('comment-1', 'user-1');

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { isDeleted: true },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
