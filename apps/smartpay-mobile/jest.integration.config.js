/**
 * Jest Configuration for Integration Tests
 * Location: fintech/smartpay-mobile/jest.integration.config.js
 * 
 * Configuration for integration tests that use:
 * - Real database connections
 * - Real API calls (no mocks)
 * - Real webhook processing
 * - Sequential execution to prevent conflicts
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/integration'],
  testMatch: ['**/*.integration.test.ts'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/__tests__/integration/setup/jest.setup.ts'],

  globalSetup: '<rootDir>/__tests__/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/integration/setup/global-teardown.ts',

  testTimeout: 30000,

  maxWorkers: 1,

  collectCoverageFrom: [
    'services/**/*.ts',
    '!services/**/*.test.ts',
    '!**/__tests__/**',
  ],

  coverageDirectory: '<rootDir>/coverage/integration',

  verbose: true,

  bail: false,

  forceExit: true,

  detectOpenHandles: true,

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/__tests__/(?!integration).*',
  ],
};
