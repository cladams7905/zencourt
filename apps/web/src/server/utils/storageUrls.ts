import storageService from "../services/storageService";
import {
  createChildLogger,
  logger as baseLogger
} from "../../lib/logger";
import {
  extractStorageKeyFromUrl,
  isUrlFromStorageEndpoint
} from "@shared/utils/storagePaths";

const logger = createChildLogger(baseLogger, {
  module: "storage-url-utils"
});

const storageEndpoint = process.env.B2_ENDPOINT || null;

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
export const DEFAULT_THUMBNAIL_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const CACHE_SAFETY_BUFFER_SECONDS = 60;

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

export function isManagedStorageUrl(url: string): boolean {
  return isUrlFromStorageEndpoint(url, storageEndpoint);
}

function buildCacheKey(url: string, expiresIn: number): string | null {
  if (!isManagedStorageUrl(url)) {
    return null;
  }
  try {
    const key = extractStorageKeyFromUrl(url);
    return `${key}:${expiresIn}`;
  } catch (error) {
    logger.warn(
      { url, err: error instanceof Error ? error.message : String(error) },
      "Failed to derive cache key for storage URL"
    );
    return null;
  }
}

function getCachedSignedUrl(cacheKey: string | null): string | null {
  if (!cacheKey) {
    return null;
  }
  const entry = signedUrlCache.get(cacheKey);
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    signedUrlCache.delete(cacheKey);
    return null;
  }
  return entry.url;
}

function setCachedSignedUrl(
  cacheKey: string | null,
  url: string,
  expiresIn: number
): void {
  if (!cacheKey) {
    return;
  }
  const effectiveTtlSeconds = Math.max(
    1,
    expiresIn - CACHE_SAFETY_BUFFER_SECONDS,
    Math.floor(expiresIn * 0.75)
  );
  signedUrlCache.set(cacheKey, {
    url,
    expiresAt: Date.now() + effectiveTtlSeconds * 1000
  });
}

export async function getSignedDownloadUrl(
  url: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  if (!url) {
    throw new Error("URL is required to ensure public access");
  }

  if (!isManagedStorageUrl(url)) {
    return url;
  }

  const cacheKey = buildCacheKey(url, expiresIn);
  const cached = getCachedSignedUrl(cacheKey);
  if (cached) {
    return cached;
  }

  const signedResult = await storageService.getSignedDownloadUrl(
    url,
    expiresIn
  );

  if (!signedResult.success) {
    logger.error(
      {
        url,
        error: signedResult.error
      },
      "Failed to generate signed download URL"
    );
    throw new Error(
      signedResult.error || "Failed to generate signed download URL"
    );
  }

  setCachedSignedUrl(cacheKey, signedResult.url, expiresIn);
  return signedResult.url;
}

export async function getSignedDownloadUrlSafe(
  url?: string | null,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | undefined> {
  if (!url) {
    return undefined;
  }
  try {
    return await getSignedDownloadUrl(url, expiresIn);
  } catch {
    return url ?? undefined;
  }
}

export async function resolveSignedDownloadUrl(
  url?: string | null,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const signed = await getSignedDownloadUrlSafe(url, expiresIn);
  return signed ?? null;
}

export async function getSignedDownloadUrls(
  urls: string[],
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string[]> {
  return Promise.all(urls.map((url) => getSignedDownloadUrl(url, expiresIn)));
}
