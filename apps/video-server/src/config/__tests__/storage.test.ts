import { S3Client } from "@aws-sdk/client-s3";
import {
  createStorageClient,
  createStorageConfig,
  STORAGE_CONFIG
} from "@/config/storage";

describe("storage config", () => {
  const BASE_ENV: NodeJS.ProcessEnv = {
    B2_ENDPOINT: "https://s3.us-west-001.backblazeb2.com",
    B2_REGION: "us-west-001",
    B2_KEY_ID: "key-id",
    B2_APPLICATION_KEY: "app-key",
    B2_BUCKET_NAME: "bucket-name"
  };

  it("builds normalized storage config", () => {
    const config = createStorageConfig(BASE_ENV);
    expect(config.endpoint).toBe(BASE_ENV.B2_ENDPOINT);
    expect(config.bucket).toBe(BASE_ENV.B2_BUCKET_NAME);
    expect(config.region).toBe(BASE_ENV.B2_REGION);
  });

  it("creates an S3 client from config", () => {
    const config = createStorageConfig(BASE_ENV);
    const client = createStorageClient(config);
    expect(client).toBeInstanceOf(S3Client);
  });

  it("exports runtime STORAGE_CONFIG shape", () => {
    expect(STORAGE_CONFIG).toEqual(
      expect.objectContaining({
        endpoint: expect.any(String),
        region: expect.any(String),
        bucket: expect.any(String)
      })
    );
  });
});
