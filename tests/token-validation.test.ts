import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../server/index';

describe('Token Validation Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('Token Format Validation', () => {
    it('should validate user-id-timestamp token format', async () => {
      const validToken = 'user-1-1234567890';
      
      const response = await request(app)
        .get('/api/token-check')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        present: true,
        format: 'user-id-timestamp',
        userIdPresent: true,
        timestampPresent: true,
        isValidUserId: true
      });
    });

    it('should reject tokens with invalid user ID', async () => {
      const invalidTokens = [
        'user-abc-1234567890',  // non-numeric user ID
        'user--1234567890',     // empty user ID
        'user-0-1234567890',    // zero user ID
        'user--1-1234567890'    // negative user ID
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/token-check')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.isValidUserId).toBe(false);
      }
    });

    it('should reject malformed token formats', async () => {
      const malformedTokens = [
        'user-1',               // missing timestamp
        'user',                 // missing both ID and timestamp
        '1-1234567890',         // missing user prefix
        'admin-1-1234567890',   // wrong prefix
        '',                     // empty token
        'user-1-2-3-4'         // too many parts
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/token-check')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        if (token === '') {
          expect(response.body.present).toBe(false);
        } else {
          expect(response.body.format).toBe('unknown');
        }
      }
    });

    it('should handle tokens without Bearer prefix', async () => {
      const token = 'user-1-1234567890';
      
      const response = await request(app)
        .get('/api/token-check')
        .set('Authorization', token)
        .expect(200);

      expect(response.body.present).toBe(false);
    });

    it('should handle missing Authorization header', async () => {
      const response = await request(app)
        .get('/api/token-check')
        .expect(200);

      expect(response.body.present).toBe(false);
    });
  });

  describe('Token Security Tests', () => {
    it('should reject tokens with SQL injection attempts', async () => {
      const maliciousTokens = [
        "user-1'; DROP TABLE users; --",
        'user-1" OR 1=1 --',
        'user-1/**/UNION/**/SELECT/**/',
        'user-<script>alert(1)</script>-123'
      ];

      for (const token of maliciousTokens) {
        await request(app)
          .get('/api/user')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('should handle extremely large tokens', async () => {
      const largeToken = 'user-1-' + 'x'.repeat(100000);
      
      await request(app)
        .get('/api/token-check')
        .set('Authorization', `Bearer ${largeToken}`)
        .expect(200);
    });

    it('should handle special characters in tokens', async () => {
      const specialCharTokens = [
        'user-1-123!@#$%^&*()',
        'user-1-123<>?:"{}|',
        'user-1-123\\n\\r\\t',
        'user-1-123%20%21%22'
      ];

      for (const token of specialCharTokens) {
        const response = await request(app)
          .get('/api/token-check')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.present).toBe(true);
      }
    });
  });

  describe('Token Authentication Edge Cases', () => {
    it('should handle multiple Authorization headers', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', 'Bearer user-1-123')
        .set('Authorization', 'Bearer user-2-456')
        .expect(401); // Should fail due to conflicting headers
    });

    it('should handle case-sensitive Bearer prefix', async () => {
      const token = 'user-1-1234567890';
      
      // Should fail with lowercase 'bearer'
      await request(app)
        .get('/api/user')
        .set('Authorization', `bearer ${token}`)
        .expect(401);

      // Should fail with 'BEARER'
      await request(app)
        .get('/api/user')
        .set('Authorization', `BEARER ${token}`)
        .expect(401);

      // Should work with proper 'Bearer'
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(1); // TokenUser ID
    });

    it('should handle whitespace in tokens', async () => {
      const tokensWithWhitespace = [
        ' user-1-123',          // leading space
        'user-1-123 ',          // trailing space
        'user-1-123\t',         // tab character
        'user-1-123\n',         // newline
        'user - 1 - 123'        // spaces in token
      ];

      for (const token of tokensWithWhitespace) {
        await request(app)
          .get('/api/user')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });
  });

  describe('Automated Token Generation Tests', () => {
    it('should validate tokens generated by the original manual script', async () => {
      // Simulate the token generation from the original script
      const userId = 1;
      const timestamp = Date.now();
      const generatedToken = `user-${userId}-${timestamp}`;
      
      // Test the generated token
      const response = await request(app)
        .get('/api/token-check')
        .set('Authorization', `Bearer ${generatedToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        present: true,
        format: 'user-id-timestamp',
        userIdPresent: true,
        timestampPresent: true,
        isValidUserId: true,
        userId: userId
      });

      // Test authentication with generated token
      await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${generatedToken}`)
        .expect(200);
    });

    it('should validate multiple tokens for different users', async () => {
      const userIds = [1, 2, 10, 999];
      const timestamp = Date.now();

      for (const userId of userIds) {
        const token = `user-${userId}-${timestamp}`;
        
        const checkResponse = await request(app)
          .get('/api/token-check')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(checkResponse.body.userId).toBe(userId);
        expect(checkResponse.body.isValidUserId).toBe(true);

        // Test authentication
        const userResponse = await request(app)
          .get('/api/user')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(userResponse.body.id).toBe(userId);
      }
    });

    it('should validate tokens with different timestamps', async () => {
      const userId = 1;
      const timestamps = [
        Date.now(),
        Date.now() - 86400000,  // 1 day ago
        Date.now() + 86400000,  // 1 day from now
        1234567890,             // Fixed timestamp
        0                       // Zero timestamp
      ];

      for (const timestamp of timestamps) {
        const token = `user-${userId}-${timestamp}`;
        
        const response = await request(app)
          .get('/api/token-check')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.timestamp).toBe(timestamp.toString());
        expect(response.body.timestampPresent).toBe(true);
      }
    });
  });
});