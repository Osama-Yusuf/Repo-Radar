// backend/tests/setup.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Mock the database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  execute: jest.fn(), // For general execution
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockReturnThis(),
  onConflictDoNothing: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  // Add other methods as they appear in test errors
};

jest.mock('../src/config/drizzle-client', () => ({
  db: mockDb,
}));
jest.mock('../src/config/database', () => ({ // If this is where drizzle client is initialized
    db: mockDb,
    initializeDatabase: jest.fn().mockResolvedValue(mockDb), // Mock initialization
    pool: { // Mock pool if it's used directly (e.g. in server.js for shutdown)
        end: jest.fn().mockResolvedValue(),
    }
}));


// Mock bcrypt for user management tests to avoid long hashing times
const bcrypt = require('bcrypt');
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((password, saltRounds) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn().mockImplementation((plainPassword, hashedPassword) => Promise.resolve(hashedPassword === `hashed_${plainPassword}`)),
}));


beforeEach(() => {
  // Reset mocks before each test to ensure test isolation
  for (const key in mockDb) {
    if (typeof mockDb[key] === 'function' && typeof mockDb[key].mockClear === 'function') {
      mockDb[key].mockClear();
      // Reset to default mockReturnThis for chainable methods
      if (['select', 'from', 'where', 'orderBy', 'limit', 'values', 'returning', 'onConflictDoUpdate', 'onConflictDoNothing', 'set', 'insert', 'update', 'delete'].includes(key)) {
        mockDb[key].mockReturnThis();
      }
    }
  }
  // Default mock for execute/returning if needed for all tests, or set in specific tests
  mockDb.execute.mockResolvedValue([]); 
  mockDb.returning.mockResolvedValue([]);
});

beforeAll(async () => {
  console.log('Global test setup: Mocks configured. Before all tests.');
});

afterAll(async () => {
  console.log('Global test setup: After all tests.');
});
