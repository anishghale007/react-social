import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testUser = {
    email: `test-${uniqueSuffix}@test.com`,
    username: `user${uniqueSuffix}`,
    password: 'password123',
  };

  let accessToken: string;
  let userId: string;
  let postId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('Auth flow', () => {
    it('POST /auth/register - creates a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).not.toHaveProperty('passwordHash');

      accessToken = res.body.accessToken;
      userId = res.body.user.id;
    });

    it('POST /auth/register - rejects duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('POST /auth/login - rejects wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('POST /auth/login - succeeds with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
    });

    it('GET /users/me - rejects request with no token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('GET /users/me - returns current user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
    });
  });

  describe('Posts flow', () => {
    it('POST /posts - rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .send({ content: 'Should fail' })
        .expect(401);
    });

    it('POST /posts - creates a post when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: 'My e2e test post' })
        .expect(201);

      expect(res.body.content).toBe('My e2e test post');
      expect(res.body.authorId).toBe(userId);
      postId = res.body.id;
    });

    it('GET /posts - returns paginated posts including the new one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('PATCH /posts/:id - rejects editing another users post', async () => {
      const otherSuffix = (Date.now() + 1).toString().slice(-6);
      const otherUser = {
        email: `other-${otherSuffix}@test.com`,
        username: `other${otherSuffix}`,
        password: 'password123',
      };
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(otherUser);
      const otherToken = registerRes.body.accessToken;

      await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Trying to hijack this post' })
        .expect(403);

      await prisma.user.deleteMany({ where: { email: otherUser.email } });
    });

    it('PATCH /posts/:id - allows the author to edit their own post', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ content: 'Edited content' })
        .expect(200);

      expect(res.body.content).toBe('Edited content');
    });

    it('POST /posts/:id/like - toggles a like', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.liked).toBe(true);
    });

    it('DELETE /posts/:id - allows the author to delete their own post', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Route ordering sanity checks', () => {
    it('GET /users/search does not get swallowed by GET /users/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/search?q=test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
    });

    it('GET /posts/search does not get swallowed by GET /posts/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/search?q=test')
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});
