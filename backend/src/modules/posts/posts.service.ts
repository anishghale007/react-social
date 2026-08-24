import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { NotificationsService } from '../notifcations/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly authorSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
  };

  async create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: { content: dto.content, authorId },
      include: { author: { select: this.authorSelect } },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { isDeleted: false },
        include: {
          author: { select: this.authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where: { isDeleted: false } }),
    ]);

    return {
      data: posts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, isDeleted: false },
      include: {
        author: { select: this.authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.findOne(id);
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    return this.prisma.post.update({
      where: { id },
      data: { content: dto.content },
      include: { author: { select: this.authorSelect } },
    });
  }

  async remove(id: string, userId: string) {
    const post = await this.findOne(id);
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    // Soft delete — keeps referential integrity for future Likes/Comments
    await this.prisma.post.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { success: true };
  }

  async findByUser(authorId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { authorId, isDeleted: false },
        include: { author: { select: this.authorSelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where: { authorId, isDeleted: false } }),
    ]);

    return {
      data: posts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.findOne(postId);

    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { postId, userId } });

    await this.notificationsService.create({
      type: 'LIKE',
      recipientId: post.authorId,
      actorId: userId,
      postId,
    });

    return { liked: true };
  }

  async getLikeStatus(postId: string, userId: string) {
    const [count, userLike] = await this.prisma.$transaction([
      this.prisma.like.count({ where: { postId } }),
      this.prisma.like.findUnique({
        where: { postId_userId: { postId, userId } },
      }),
    ]);
    return { count, likedByMe: Boolean(userLike) };
  }

  async createComment(postId: string, authorId: string, content: string) {
    const post = await this.findOne(postId);

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, content },
      include: { author: { select: this.authorSelect } },
    });

    await this.notificationsService.create({
      type: 'COMMENT',
      recipientId: post.authorId,
      actorId: authorId,
      postId,
    });

    return comment;
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { postId, isDeleted: false },
        include: { author: { select: this.authorSelect } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where: { postId, isDeleted: false } }),
    ]);

    return {
      data: comments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.isDeleted)
      throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
    return { success: true };
  }

  async searchPosts(query: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: {
          isDeleted: false,
          content: { contains: query, mode: 'insensitive' },
        },
        include: {
          author: { select: this.authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({
        where: {
          isDeleted: false,
          content: { contains: query, mode: 'insensitive' },
        },
      }),
    ]);

    return {
      data: posts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findFollowingFeed(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { authorId: { in: followingIds }, isDeleted: false },
        include: {
          author: { select: this.authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({
        where: { authorId: { in: followingIds }, isDeleted: false },
      }),
    ]);

    return {
      data: posts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
