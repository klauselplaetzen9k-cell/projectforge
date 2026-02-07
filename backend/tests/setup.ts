import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Setup test environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.NODE_ENV = 'test';

// Mock Prisma Client for testing
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      project: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    })),
  };
});

// Global test setup
beforeAll(() => {
  // Setup any global test configurations
});

afterAll(() => {
  vi.restoreAllMocks();
});

export {};
