import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./"
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}"
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
    "\\.(css|less|scss|sass)$": "<rootDir>/src/test/styleMock.js"
  }
};

export default createJestConfig(customJestConfig);
