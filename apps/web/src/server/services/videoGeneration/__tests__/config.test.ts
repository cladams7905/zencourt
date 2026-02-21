import {
  VIDEO_GENERATION_DEFAULT_ORIENTATION,
  VIDEO_GENERATION_ENABLE_PRIORITY_SECONDARY,
  VIDEO_GENERATION_MODEL,
  getVideoGenerationConfig
} from "../config";

describe("videoGeneration/config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VIDEO_SERVER_URL;
    delete process.env.VIDEO_SERVER_API_KEY;
    delete process.env.VERCEL_URL;
    delete process.env.APP_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("builds config from environment with APP_URL", () => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com///";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
    process.env.APP_URL = "http://localhost:3000";

    expect(getVideoGenerationConfig()).toEqual({
      model: VIDEO_GENERATION_MODEL,
      defaultOrientation: VIDEO_GENERATION_DEFAULT_ORIENTATION,
      enablePrioritySecondary: VIDEO_GENERATION_ENABLE_PRIORITY_SECONDARY,
      videoServerBaseUrl: "https://video.example.com",
      videoServerApiKey: "test-key",
      appUrl: "http://localhost:3000"
    });
  });

  it("builds config from VERCEL_URL when on Vercel", () => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
    process.env.VERCEL_URL = "my-app.vercel.app";

    expect(getVideoGenerationConfig()).toEqual({
      model: VIDEO_GENERATION_MODEL,
      defaultOrientation: VIDEO_GENERATION_DEFAULT_ORIENTATION,
      enablePrioritySecondary: VIDEO_GENERATION_ENABLE_PRIORITY_SECONDARY,
      videoServerBaseUrl: "https://video.example.com",
      videoServerApiKey: "test-key",
      appUrl: "https://my-app.vercel.app"
    });
  });

  it("throws when env vars are missing", () => {
    expect(() => getVideoGenerationConfig()).toThrow(
      "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured"
    );
  });

  it("throws when APP_URL is missing and not on Vercel", () => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com";
    process.env.VIDEO_SERVER_API_KEY = "test-key";

    expect(() => getVideoGenerationConfig()).toThrow(
      "APP_URL must be configured"
    );
  });
});
