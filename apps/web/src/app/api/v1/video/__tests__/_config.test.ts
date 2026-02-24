/** @jest-environment node */

import { getVideoServerConfig } from "../_config";

describe("video config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns normalized config when required env vars exist", () => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com///";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
    process.env.VERCEL_WEBHOOK_SECRET = "secret";

    const config = getVideoServerConfig();

    expect(config).toEqual({
      baseUrl: "https://video.example.com",
      apiKey: "test-key",
      webhookSecret: "secret"
    });
  });

  it("throws when base URL or API key is missing", () => {
    delete process.env.VIDEO_SERVER_URL;
    delete process.env.VIDEO_SERVER_API_KEY;

    expect(() => getVideoServerConfig()).toThrow(
      "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured"
    );
  });

  it("throws when webhook secret is required but missing", () => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
    delete process.env.VERCEL_WEBHOOK_SECRET;

    expect(() => getVideoServerConfig({ requireWebhookSecret: true })).toThrow(
      "VERCEL_WEBHOOK_SECRET must be configured"
    );
  });
});
