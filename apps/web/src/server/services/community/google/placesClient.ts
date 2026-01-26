import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "community-places-client"
});

type PlaceDetailsSummary = {
  text?: string;
  languageCode?: string;
};

type PlaceDetailsGenerativeSummary = {
  overview?: PlaceDetailsSummary;
  overviewFlagContentUri?: string;
  disclaimerText?: PlaceDetailsSummary;
};

export type PlaceDetailsResponse = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  generativeSummary?: PlaceDetailsGenerativeSummary;
};

export type PlaceResult = {
  displayName?: { text?: string };
  formattedAddress?: string;
  id?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  types?: string[];
  websiteUri?: string;
};

type PlacesSearchResponse = {
  places?: PlaceResult[];
};

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACES_FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.id",
  "places.location",
  "places.rating",
  "places.userRatingCount"
].join(",");

const PLACE_DETAILS_FIELD_MASK = [
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "primaryType",
  "types",
  "generativeSummary"
].join(",");

// ============================================================================
// REQUEST DEDUPLICATION
// ============================================================================

// Maps for tracking in-flight requests to prevent duplicate API calls
const pendingPlaceSearches = new Map<string, Promise<PlaceResult[]>>();
const pendingPlaceDetails = new Map<string, Promise<PlaceDetailsResponse | null>>();

function getPlaceSearchKey(
  query: string,
  lat: number,
  lng: number,
  maxResults: number,
  radius: number
): string {
  return `search:${query}:${lat.toFixed(4)}:${lng.toFixed(4)}:${maxResults}:${radius}`;
}

function getPlaceDetailsKey(placeId: string): string {
  return `details:${placeId}`;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  // Retry on rate limits (429), server errors (5xx), and network issues
  return status === 429 || (status >= 500 && status < 600);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok || !shouldRetry(response.status)) {
        return response;
      }

      logger.warn(
        { url, status: response.status, attempt, maxAttempts: config.maxAttempts },
        "Retryable response"
      );

      // Calculate exponential backoff delay
      if (attempt < config.maxAttempts) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt - 1),
          config.maxDelayMs
        );
        await sleep(delay);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn(
        { url, error: lastError.message, attempt, maxAttempts: config.maxAttempts },
        "Retryable fetch error"
      );

      // Only retry on network errors for remaining attempts
      if (attempt < config.maxAttempts) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt - 1),
          config.maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  // If we exhausted retries, throw or return a failed response
  if (lastError) {
    logger.error(
      { url, error: lastError.message, maxAttempts: config.maxAttempts },
      "Exhausted retries"
    );
    throw lastError;
  }

  // Return a synthetic failed response if we somehow get here
  logger.error(
    { url, maxAttempts: config.maxAttempts },
    "Exhausted retries without error"
  );
  return new Response(null, { status: 503 });
}

// ============================================================================
// API KEY
// ============================================================================

function getGoogleApiKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export async function fetchPlaces(
  query: string,
  location: { lat: number; lng: number },
  maxResults: number,
  radiusMeters: number
): Promise<PlaceResult[]> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    return [];
  }

  // Check for existing in-flight request with same parameters
  const cacheKey = getPlaceSearchKey(query, location.lat, location.lng, maxResults, radiusMeters);
  const pending = pendingPlaceSearches.get(cacheKey);
  if (pending) {
    return pending;
  }

  // Create new request promise
  const requestPromise = (async (): Promise<PlaceResult[]> => {
    try {
      const response = await fetchWithRetry(PLACES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": PLACES_FIELD_MASK
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: maxResults,
          locationBias: {
            circle: {
              center: {
                latitude: location.lat,
                longitude: location.lng
              },
              radius: radiusMeters
            }
          }
        })
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, query },
          "Places search failed"
        );
        return [];
      }

      const payload = (await response.json()) as PlacesSearchResponse;
      return payload.places ?? [];
    } catch {
      return [];
    } finally {
      // Clean up pending request after completion
      pendingPlaceSearches.delete(cacheKey);
    }
  })();

  // Store and return the promise
  pendingPlaceSearches.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function fetchPlacesNearby(
  includedTypes: string[],
  location: { lat: number; lng: number },
  maxResults: number,
  radiusMeters: number
): Promise<PlaceResult[]> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    return [];
  }

  // Create unique key for nearby search
  const typesKey = includedTypes.sort().join(",");
  const cacheKey = `nearby:${typesKey}:${location.lat.toFixed(4)}:${location.lng.toFixed(4)}:${maxResults}:${radiusMeters}`;
  const pending = pendingPlaceSearches.get(cacheKey);
  if (pending) {
    return pending;
  }

  const requestPromise = (async (): Promise<PlaceResult[]> => {
    try {
      const response = await fetchWithRetry(PLACES_NEARBY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": PLACES_FIELD_MASK
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: maxResults,
          locationRestriction: {
            circle: {
              center: {
                latitude: location.lat,
                longitude: location.lng
              },
              radius: radiusMeters
            }
          }
        })
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, includedTypes },
          "Nearby search failed"
        );
        return [];
      }

      const payload = (await response.json()) as PlacesSearchResponse;
      return payload.places ?? [];
    } catch {
      return [];
    } finally {
      pendingPlaceSearches.delete(cacheKey);
    }
  })();

  pendingPlaceSearches.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function fetchPlaceDetails(
  placeId: string
): Promise<PlaceDetailsResponse | null> {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    return null;
  }

  // Check for existing in-flight request
  const cacheKey = getPlaceDetailsKey(placeId);
  const pending = pendingPlaceDetails.get(cacheKey);
  if (pending) {
    return pending;
  }

  const requestPromise = (async (): Promise<PlaceDetailsResponse | null> => {
    try {
      const response = await fetchWithRetry(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK
          }
        }
      );

      if (!response.ok) {
        logger.warn(
          { status: response.status, placeId },
          "Place details failed"
        );
        return null;
      }

      return (await response.json()) as PlaceDetailsResponse;
    } catch {
      return null;
    } finally {
      pendingPlaceDetails.delete(cacheKey);
    }
  })();

  pendingPlaceDetails.set(cacheKey, requestPromise);
  return requestPromise;
}
