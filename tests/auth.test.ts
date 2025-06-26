import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../server/index';
import { storage } from '../server/storage';

describe('Authentication System', () => {
  let app: Express;
  let testUserId: number;
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpassword123'
  };

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    // Note: No deleteUser method available in storage interface
    // Test users will remain in database for manual cleanup if needed
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');

      testUserId = response.body.id;
    });

    it('should reject duplicate username registration', async () => {
      const duplicateUser = {
        username: testUser.username,
        email: 'different@example.com',
        password: 'differentpassword'
      };

      const response = await request(app)
        .post('/api/register')
        .send(duplicateUser)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Username already exists');
    });

    it('should reject registration with invalid data', async () => {
      const invalidUser = {
        username: '',
        email: 'invalid-email',
        password: '123' // too short
      };

      await request(app)
        .post('/api/register')
        .send(invalidUser)
        .expect(400);
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'anypassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Session-based Authentication', () => {
    let sessionCookie: string;

    beforeAll(async () => {
      // Login to get session cookie
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      const cookies = loginResponse.headers['set-cookie'];
      sessionCookie = cookies.find((cookie: string) => cookie.startsWith('quill_sid='));
    });

    it('should access protected endpoint with valid session', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('username', testUser.username);
    });

    it('should reject protected endpoint without session', async () => {
      await request(app)
        .get('/api/user')
        .expect(401);
    });

    it('should check session status correctly', async () => {
      const response = await request(app)
        .get('/api/session-check')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toHaveProperty('sessionActive', true);
      expect(response.body).toHaveProperty('isAuthenticated', true);
      expect(response.body).toHaveProperty('hasUser', true);
    });
  });

  describe('Token-based Authentication', () => {
    const validToken = `user-${testUserId}-${Date.now()}`;
    const invalidToken = 'invalid-token-format';

    it('should validate token format correctly', async () => {
      const response = await request(app)
        .get('/api/token-check')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('present', true);
      expect(response.body).toHaveProperty('format', 'user-id-timestamp');
      expect(response.body).toHaveProperty('isValidUserId', true);
    });

    it('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/api/token-check')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('present', true);
      expect(response.body).toHaveProperty('format', 'unknown');
    });

    it('should access protected endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUserId);
    });

    it('should reject protected endpoint with invalid token', async () => {
      await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject protected endpoint without Bearer prefix', async () => {
      await request(app)
        .get('/api/user')
        .set('Authorization', validToken)
        .expect(401);
    });
  });

  describe('Logout', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      // Login to get session cookie
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      const cookies = loginResponse.headers['set-cookie'];
      sessionCookie = cookies.find((cookie: string) => cookie.startsWith('quill_sid='));
    });

    it('should logout and destroy session', async () => {
      await request(app)
        .post('/api/logout')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Verify session is destroyed
      await request(app)
        .get('/api/user')
        .set('Cookie', sessionCookie)
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    const validToken = `user-${testUserId}-${Date.now()}`;

    it('should protect project routes', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);

      await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('should protect story bible routes', async () => {
      await request(app)
        .get('/api/story-bible')
        .expect(401);

      await request(app)
        .get('/api/story-bible')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('should protect chapter routes', async () => {
      await request(app)
        .get('/api/chapters/1')
        .expect(401);

      await request(app)
        .get('/api/chapters/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404); // Not found is OK, we're testing auth
    });
  });

  describe('Development Mode Bypass', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should bypass authentication in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app)
        .get('/api/user')
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('username', 'DevUser');
    });
  });
});