/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // Integration tests boot a full Strapi instance and need a long timeout.
  testTimeout: 60000,
  // Run test files serially so the integration suite owns the test DB exclusively.
  maxWorkers: 1,
  // Strapi can leave background handles open; force a clean exit after teardown.
  forceExit: true,
  // Ignore Strapi's own type config strictness for test files.
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowJs: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
