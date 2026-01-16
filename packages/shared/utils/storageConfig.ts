export type StorageEnvConfig = {
  B2_ENDPOINT?: string;
  B2_REGION?: string;
  B2_BUCKET_NAME?: string;
  B2_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  STORAGE_PUBLIC_BASE_URL?: string;
};

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  keyId: string;
  applicationKey: string;
  publicBaseUrl?: string;
};

type StorageConfigOptions = {
  defaultRegion?: string;
};

export function buildStorageConfigFromEnv(
  env: StorageEnvConfig,
  options: StorageConfigOptions = {}
): StorageConfig {
  const endpoint = env.B2_ENDPOINT?.trim();
  const bucket = env.B2_BUCKET_NAME?.trim();
  const keyId = env.B2_KEY_ID?.trim();
  const applicationKey = env.B2_APPLICATION_KEY?.trim();
  const region = env.B2_REGION?.trim() || options.defaultRegion;
  const publicBaseUrl = env.STORAGE_PUBLIC_BASE_URL?.trim();

  if (!endpoint) {
    throw new Error("B2_ENDPOINT environment variable is required");
  }
  if (!bucket) {
    throw new Error("B2_BUCKET_NAME environment variable is required");
  }
  if (!keyId) {
    throw new Error("B2_KEY_ID environment variable is required");
  }
  if (!applicationKey) {
    throw new Error("B2_APPLICATION_KEY environment variable is required");
  }
  if (!region) {
    throw new Error("B2_REGION environment variable is required");
  }

  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    region,
    bucket,
    keyId,
    applicationKey,
    publicBaseUrl: publicBaseUrl
      ? publicBaseUrl.replace(/\/+$/, "")
      : undefined
  };
}
