import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { pool } from '../server/db';

// Global test setup
beforeAll(async () => {
  // Database connection is already established in db.ts
  console.log('Test suite starting - database connection ready');
});

afterAll(async () => {
  // Close database connections
  await pool.end();
  console.log('Test suite completed - database connections closed');
});

// Clean up between tests
beforeEach(async () => {
  // Reset any test-specific state if needed
});

afterEach(async () => {
  // Clean up any test data if needed
});