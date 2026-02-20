module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleNameMapper: {
    "^@db/(.*)$": "<rootDir>/../db/$1",
    "^@shared/(.*)$": "<rootDir>/$1",
    "^nanoid$": "<rootDir>/__mocks__/nanoid.ts"
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  watchman: false
};
