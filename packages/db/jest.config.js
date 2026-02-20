module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleNameMapper: {
    "^@db/(.*)$": "<rootDir>/$1",
    "^@shared/(.*)$": "<rootDir>/../shared/$1",
    "^nanoid$": "<rootDir>/../shared/__mocks__/nanoid.ts"
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  watchman: false
};
