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
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("builds config from environment", () => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com///";
    process.env.VIDEO_SERVER_API_KEY = "test-key";

    expect(getVideoGenerationConfig()).toEqual({
      model: VIDEO_GENERATION_MODEL,
      defaultOrientation: VIDEO_GENERATION_DEFAULT_ORIENTATION,
      enablePrioritySecondary: VIDEO_GENERATION_ENABLE_PRIORITY_SECONDARY,
      videoServerBaseUrl: "https://video.example.com",
      videoServerApiKey: "test-key"
    });
  });

  it("throws when env vars are missing", () => {
    expect(() => getVideoGenerationConfig()).toThrow(
      "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured"
    );
  });
});
