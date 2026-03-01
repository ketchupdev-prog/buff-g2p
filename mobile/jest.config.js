/**
 * Jest config – Buffr G2P.
 * Unit tests (utils, services) run in Node; no jest-expo to avoid preset setup issues.
 */
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)', '**/*.(test|spec).(ts|tsx|js|jsx)'],
  collectCoverageFrom: ['utils/**/*.ts', 'services/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '__tests__', '.test.', '.spec.'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
