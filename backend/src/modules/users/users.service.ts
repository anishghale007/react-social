import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifcations/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(params: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.findByEmail(params.email),
      this.findByUsername(params.username),
    ]);

    if (existingEmail) throw new ConflictException('Email already in use');
    if (existingUsername) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash(params.password, 10);

    return this.prisma.user.create({
      data: {
        email: params.email,
        username: params.username,
        passwordHash,
        displayName: params.displayName ?? params.username,
      },
    });
  }

  async validatePassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }

  async findAllExcept(excludeUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: { username: 'asc' },
    });
    return users;
  }

  async findPublicProfile(userId: string, viewerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            posts: { where: { isDeleted: false } },
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const isFollowing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewerId, followingId: userId },
      },
    });

    return { ...user, isFollowing: Boolean(isFollowing) };
  }

  async updateProfile(
    userId: string,
    dto: { displayName?: string; bio?: string },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return this.sanitize(updated);
  }

  async searchUsers(query: string, excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        isActive: true,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
      take: 20,
      orderBy: { username: 'asc' },
    });
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ForbiddenException('Cannot follow yourself');
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      return { following: true };
    }

    await this.prisma.follow.create({ data: { followerId, followingId } });

    await this.notificationsService.create({
      type: 'FOLLOW',
      recipientId: followingId,
      actorId: followerId,
    });

    return { following: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
    return { following: false };
  }

  async getFollowStatus(followerId: string, followingId: string) {
    const [isFollowing, followerCount, followingCount] =
      await this.prisma.$transaction([
        this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId, followingId } },
        }),
        this.prisma.follow.count({ where: { followingId } }),
        this.prisma.follow.count({ where: { followerId: followingId } }),
      ]);

    return {
      isFollowing: Boolean(isFollowing),
      followerCount,
      followingCount,
    };
  }

  async getFollowers(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return follows.map((f) => f.following);
  }

  // Strips passwordHash before sending user object back to client
  sanitize(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
