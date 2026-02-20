import { buildStorageConfigFromEnv } from "../utils/storageConfig";

describe("buildStorageConfigFromEnv", () => {
  it("builds normalized storage config", () => {
    const config = buildStorageConfigFromEnv(
      {
        B2_ENDPOINT: "https://s3.us-west-002.backblazeb2.com/",
        B2_REGION: "us-west-002",
        B2_BUCKET_NAME: "bucket-a",
        B2_KEY_ID: "key",
        B2_APPLICATION_KEY: "secret",
        STORAGE_PUBLIC_BASE_URL: "https://cdn.example.com/"
      },
      { defaultRegion: "fallback" }
    );

    expect(config).toEqual({
      endpoint: "https://s3.us-west-002.backblazeb2.com",
      region: "us-west-002",
      bucket: "bucket-a",
      keyId: "key",
      applicationKey: "secret",
      publicBaseUrl: "https://cdn.example.com"
    });
  });

  it("uses default region when B2_REGION is missing", () => {
    const config = buildStorageConfigFromEnv(
      {
        B2_ENDPOINT: "https://s3.us-west-002.backblazeb2.com",
        B2_BUCKET_NAME: "bucket-a",
        B2_KEY_ID: "key",
        B2_APPLICATION_KEY: "secret"
      },
      { defaultRegion: "us-west-002" }
    );

    expect(config.region).toBe("us-west-002");
  });

  it("throws when required env values are missing", () => {
    expect(() =>
      buildStorageConfigFromEnv(
        {
          B2_BUCKET_NAME: "bucket-a",
          B2_KEY_ID: "key",
          B2_APPLICATION_KEY: "secret",
          B2_REGION: "us-west-002"
        },
        {}
      )
    ).toThrow("B2_ENDPOINT environment variable is required");
  });
});
