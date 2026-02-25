import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./"
});

const customJestConfig = {
  testEnvironment: "jsdom",
  watchman: false,
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
  coverageReporters: ["json-summary", "json", "lcov", "text", "clover"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/testing/**",
    "!src/components/landing/**",
    "!src/components/ui/**",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
    "!src/**/index.ts"
  ],
  testMatch: [
    "<rootDir>/**/__test__/**/*.(spec|test).(js|jsx|ts|tsx)",
    "<rootDir>/**/__tests__/**/*.(spec|test).(js|jsx|ts|tsx)",
    "<rootDir>/**/*.(spec|test).(js|jsx|ts|tsx)"
  ],
  moduleNameMapper: {
    "^@web/src/(.*)$": "<rootDir>/src/$1",
    "^@web/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/$1",
    "^@db/(.*)$": "<rootDir>/../../packages/db/$1",
    "^nanoid$": "<rootDir>/__mocks__/nanoid.ts",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/test/styleMock.js"
  }
};

export default createJestConfig(customJestConfig);
