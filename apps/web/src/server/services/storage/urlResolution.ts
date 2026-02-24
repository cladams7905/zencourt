import storageService from "./service";
import { isUrlFromStorageEndpoint } from "@shared/utils/storagePaths";

const storageEndpoint = process.env.B2_ENDPOINT || null;

export function isManagedStorageUrl(url: string): boolean {
  return isUrlFromStorageEndpoint(url, storageEndpoint);
}

/**
 * Resolve a storage URL to the public CDN URL when STORAGE_PUBLIC_BASE_URL is set.
 * Returns the original URL for non-storage URLs or when resolution fails.
 */
export function getPublicDownloadUrl(url: string): string {
  if (!url) {
    return url;
  }
  const publicUrl = storageService.getPublicUrlForStorageUrl(url);
  return publicUrl ?? url;
}

/**
 * Like getPublicDownloadUrl but returns undefined for empty input.
 */
export function getPublicDownloadUrlSafe(
  url?: string | null
): string | undefined {
  if (!url) {
    return undefined;
  }
  const publicUrl = storageService.getPublicUrlForStorageUrl(url);
  return publicUrl ?? url;
}

/**
 * Resolve multiple storage URLs to public CDN URLs.
 */
export function getPublicDownloadUrls(urls: string[]): string[] {
  return urls.map((url) => getPublicDownloadUrl(url));
}

/**
 * Resolve a storage URL to public CDN URL; returns null for empty input.
 */
export function resolvePublicDownloadUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  const publicUrl = storageService.getPublicUrlForStorageUrl(url);
  return publicUrl ?? url;
}
