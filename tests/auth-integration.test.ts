import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../server/index';
import { storage } from '../server/storage';

describe('Authentication Integration Tests', () => {
  let app: Express;
  let testUserId: number;
  const testUser = {
    username: `integrationuser_${Date.now()}`,
    email: `integration_${Date.now()}@example.com`,
    password: 'integrationtest123'
  };

  beforeAll(async () => {
    app = await createApp();
    
    // Create test user
    const response = await request(app)
      .post('/api/register')
      .send(testUser);
    
    testUserId = response.body.id;
  });

  afterAll(async () => {
    // Note: No deleteUser method available in storage interface
    // Test users will remain in database for manual cleanup if needed
  });

  describe('End-to-End Authentication Flow', () => {
    it('should complete full registration -> login -> access protected resource flow', async () => {
      // Step 1: Register new user
      const newUser = {
        username: `e2euser_${Date.now()}`,
        email: `e2e_${Date.now()}@example.com`,
        password: 'e2etest123'
      };

      const registerResponse = await request(app)
        .post('/api/register')
        .send(newUser)
        .expect(201);

      const userId = registerResponse.body.id;

      try {
        // Step 2: Login with new user
        const loginResponse = await request(app)
          .post('/api/login')
          .send({
            username: newUser.username,
            password: newUser.password
          })
          .expect(200);

        const sessionCookie = (loginResponse.headers['set-cookie'] as string[])
          .find((cookie: string) => cookie.startsWith('quill_sid=')) || '';

        // Step 3: Access protected resource
        const userResponse = await request(app)
          .get('/api/user')
          .set('Cookie', sessionCookie)
          .expect(200);

        expect(userResponse.body.id).toBe(userId);
        expect(userResponse.body.username).toBe(newUser.username);

        // Step 4: Create a project (another protected resource)
        const projectData = {
          title: 'Test Project',
          description: 'E2E test project'
        };

        const projectResponse = await request(app)
          .post('/api/projects')
          .set('Cookie', sessionCookie)
          .send(projectData)
          .expect(201);

        expect(projectResponse.body.title).toBe(projectData.title);
        expect(projectResponse.body.userId).toBe(userId);

        // Step 5: Logout
        await request(app)
          .post('/api/logout')
          .set('Cookie', sessionCookie)
          .expect(200);

        // Step 6: Verify access is denied after logout
        await request(app)
          .get('/api/user')
          .set('Cookie', sessionCookie)
          .expect(401);

      } finally {
        // Note: No deleteUser method available in storage interface
        // Test user will remain in database for manual cleanup if needed
      }
    });

    it('should handle concurrent authentication attempts', async () => {
      const concurrentLogins = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/login')
          .send({
            username: testUser.username,
            password: testUser.password
          })
      );

      const responses = await Promise.all(concurrentLogins);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testUserId);
      });
    });

    it('should maintain session across multiple requests', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      const sessionCookie = loginResponse.headers['set-cookie']
        .find((cookie: string) => cookie.startsWith('quill_sid='));

      // Make multiple authenticated requests
      const requests = [
        request(app).get('/api/user').set('Cookie', sessionCookie),
        request(app).get('/api/projects').set('Cookie', sessionCookie),
        request(app).get('/api/session-check').set('Cookie', sessionCookie),
      ];

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Token Authentication Integration', () => {
    it('should work with different token formats', async () => {
      const tokens = [
        `user-${testUserId}-${Date.now()}`,
        `user-${testUserId}-${Date.now() + 1000}`,
        `user-${testUserId}-${Date.now() + 2000}`
      ];

      for (const token of tokens) {
        const response = await request(app)
          .get('/api/user')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.id).toBe(testUserId);
      }
    });

    it('should handle token and session authentication preference', async () => {
      // Login to get session
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      const sessionCookie = loginResponse.headers['set-cookie']
        .find((cookie: string) => cookie.startsWith('quill_sid='));

      const validToken = `user-${testUserId}-${Date.now()}`;

      // Request with both session and token - should prefer session
      const response = await request(app)
        .get('/api/user')
        .set('Cookie', sessionCookie)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUserId);
      expect(response.body.username).toBe(testUser.username);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed authorization headers', async () => {
      const malformedHeaders = [
        'Bearer',
        'bearer token',
        'Basic dGVzdA==',
        'Bearer ',
        'Token abc123'
      ];

      for (const header of malformedHeaders) {
        await request(app)
          .get('/api/user')
          .set('Authorization', header)
          .expect(401);
      }
    });

    it('should handle session tampering attempts', async () => {
      const tamperedCookies = [
        'quill_sid=tampered-session-id',
        'quill_sid=',
        'quill_sid=invalid.session.data'
      ];

      for (const cookie of tamperedCookies) {
        await request(app)
          .get('/api/user')
          .set('Cookie', cookie)
          .expect(401);
      }
    });

    it('should handle missing Content-Type header in login', async () => {
      const response = await request(app)
        .post('/api/login')
        .send(JSON.stringify({
          username: testUser.username,
          password: testUser.password
        }))
        .expect(401); // Should fail without proper Content-Type

      expect(response.body).toHaveProperty('message');
    });

    it('should handle extremely long tokens', async () => {
      const longToken = 'user-1-' + 'a'.repeat(10000);
      
      await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(401);
    });
  });
});