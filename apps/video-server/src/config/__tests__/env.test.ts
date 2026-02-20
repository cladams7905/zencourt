import { initializeEnv, parseEnv } from "@/config/env";

describe("env config", () => {
  const BASE_ENV: NodeJS.ProcessEnv = {
    B2_ENDPOINT: "https://s3.us-west-001.backblazeb2.com",
    B2_KEY_ID: "key",
    B2_APPLICATION_KEY: "secret",
    B2_BUCKET_NAME: "bucket",
    VIDEO_SERVER_URL: "https://video.internal.local/",
    VERCEL_WEBHOOK_SECRET: "webhook-secret",
    DATABASE_URL: "postgres://db",
    FAL_KEY: "fal-key",
    RUNWAY_API_KEY: "runway-key",
    VIDEO_SERVER_API_KEY: "server-key"
  };

  it("throws when VIDEO_SERVER_API_KEY is missing", () => {
    const env = { ...BASE_ENV };
    delete env.VIDEO_SERVER_API_KEY;
    expect(() => parseEnv(env)).toThrow("VIDEO_SERVER_API_KEY");
  });

  it("normalizes urls and derives webhook url", () => {
    const parsed = parseEnv({ ...BASE_ENV, PORT: "3002", LOG_LEVEL: "debug" });
    expect(parsed.videoServerUrl).toBe("https://video.internal.local");
    expect(parsed.falWebhookUrl).toBe("https://video.internal.local/webhooks/fal");
    expect(parsed.port).toBe(3002);
    expect(parsed.logLevel).toBe("debug");
  });

  it("initializes env values into process-style strings", () => {
    const env = { ...BASE_ENV };
    const parsed = initializeEnv(env, { exitOnError: false });
    expect(parsed.port).toBe(3001);
    expect(env.PORT).toBe("3001");
    expect(env.FAL_WEBHOOK_URL).toBe("https://video.internal.local/webhooks/fal");
  });
});
