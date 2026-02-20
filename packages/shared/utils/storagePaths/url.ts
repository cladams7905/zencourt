/**
 * Extract storage key from URL.
 */
export function extractStorageKeyFromUrl(url: string): string {
  if (url.startsWith("s3://")) {
    const parts = url.replace("s3://", "").split("/");
    parts.shift();
    return parts.join("/");
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\/+/, "");
    const host = urlObj.hostname.toLowerCase();

    if (
      (host.startsWith("s3.") || host.startsWith("s3-")) &&
      pathname.includes("/")
    ) {
      const firstSlash = pathname.indexOf("/");
      return pathname.substring(firstSlash + 1);
    }

    return pathname;
  } catch {
    throw new Error(`Invalid storage URL format: ${url}`);
  }
}

/**
 * Build a public object URL for a storage key.
 */
export function buildStoragePublicUrl(
  endpoint: string,
  bucket: string,
  key: string
): string {
  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  const normalizedKey = key.replace(/^\/+/, "");
  const encodedKey = normalizedKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedEndpoint}/${bucket}/${encodedKey}`;
}

/**
 * Extract host from a storage endpoint URL.
 */
export function getStorageEndpointHost(
  endpoint?: string | null
): string | null {
  if (!endpoint) {
    return null;
  }

  try {
    return new URL(endpoint).host;
  } catch {
    return null;
  }
}

/**
 * Determine whether a URL points to the configured storage endpoint.
 */
export function isUrlFromStorageEndpoint(
  url: string,
  endpoint?: string | null
): boolean {
  if (!url) {
    return false;
  }

  if (url.startsWith("s3://")) {
    return true;
  }

  const endpointHost = getStorageEndpointHost(endpoint);
  if (!endpointHost) {
    return false;
  }

  try {
    const urlHost = new URL(url).host;
    if (urlHost === endpointHost) {
      return true;
    }
    return urlHost.endsWith(`.${endpointHost}`);
  } catch {
    return false;
  }
}
