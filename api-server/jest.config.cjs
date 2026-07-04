/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // The project ships as ESM (package.json "type": "module"), but Jest
        // runs tests under CommonJS, so transpile test/source TS to CJS here.
        tsconfig: { module: 'commonjs' },
        diagnostics: false,
      },
    ],
  },
};
