import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    displayName: 'Test User',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            validatePassword: jest.fn(),
            sanitize: jest.fn((u) => {
              const { passwordHash, ...rest } = u;
              return rest;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.secret') return 'test-secret';
              if (key === 'jwt.expiresIn') return '7d';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('creates a user and returns sanitized user + tokens', async () => {
      usersService.createUser.mockResolvedValue(mockUser as any);
      prisma.refreshToken.create.mockResolvedValue({
        token: 'mock-refresh-token',
      });

      const result = await service.register({
        email: 'test@test.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(usersService.createUser).toHaveBeenCalledWith({
        email: 'test@test.com',
        username: 'testuser',
        password: 'password123',
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException if user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns sanitized user + tokens on valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.validatePassword.mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({
        token: 'mock-refresh-token',
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBe('mock-access-token');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException if token does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('nonexistent-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if token is revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'revoked-token',
        revoked: true,
        expiresAt: new Date(Date.now() + 100000),
        userId: 'user-1',
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'expired-token',
        revoked: false,
        expiresAt: new Date(Date.now() - 100000), // in the past
        userId: 'user-1',
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates the token and returns a new pair on success', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'valid-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
        userId: 'user-1',
      });
      prisma.refreshToken.update.mockResolvedValue({});
      usersService.findById.mockResolvedValue(mockUser as any);
      prisma.refreshToken.create.mockResolvedValue({
        token: 'new-refresh-token',
      });

      const result = await service.refresh('valid-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        data: { revoked: true },
      });
      expect(result.accessToken).toBe('mock-access-token');
    });
  });
});
