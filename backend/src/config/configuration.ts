export default () => ({
    port: parseInt(process.env.PORT || '3000', 10) || 3000,
    database: {
      url: process.env.DATABASE_URL,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:8081'],
  });