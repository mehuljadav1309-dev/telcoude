import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('healthy');
        });
    });

    it('/health/ready (GET)', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);
    });

    it('/health/live (GET)', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('alive');
        });
    });
  });

  describe('Authentication', () => {
    it('/api/v1/auth/send-code (POST) - validation error', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/send-code')
        .send({})
        .expect(400);
    });

    it('/api/v1/auth/profile (GET) - unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  describe('Files', () => {
    it('/api/v1/files (GET) - unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/v1/files')
        .expect(401);
    });

    it('/api/v1/files/stats (GET) - unauthorized', () => {
      return request(app.getHttpServer())
        .get('/api/v1/files/stats')
        .expect(401);
    });
  });
});
