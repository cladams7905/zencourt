import type { MarketData, MarketLocation } from "./types";
import { fetchPerplexityMarketData } from "./providers/perplexity";
import { fetchRentCastMarketData } from "./providers/rentcast";

type LoggerLike = {
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

type ProviderName = "perplexity" | "rentcast";

type BaseProviderDeps = {
  env: NodeJS.ProcessEnv;
  logger: LoggerLike;
  fetcher: typeof fetch;
  now: () => Date;
};

const DEFAULT_HTTP_TIMEOUT_MS = 10_000;

function getHttpTimeoutMs(
  env: NodeJS.ProcessEnv,
  envKey: string,
  fallbackMs = DEFAULT_HTTP_TIMEOUT_MS
): number {
  const raw = env[envKey];
  if (!raw) {
    return fallbackMs;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }

  return parsed;
}

function getApiKey(
  env: NodeJS.ProcessEnv,
  keyName: "RENTCAST_API_KEY" | "FRED_API_KEY",
  logger: LoggerLike
): string | null {
  const apiKey = env[keyName];
  if (!apiKey) {
    logger.warn({ envKey: keyName }, `${keyName} is not configured`);
    return null;
  }
  return apiKey;
}

export interface MarketDataProviderStrategy {
  name: ProviderName;
  displayName: string;
  cacheKeyPrefix: string;
  cacheTtlEnvKey: string;
  cacheTtlFallbackDays: number;
  getMarketData(location: MarketLocation): Promise<MarketData | null>;
}

function createPerplexityProvider(
  deps: BaseProviderDeps
): MarketDataProviderStrategy {
  return {
    name: "perplexity",
    displayName: "Perplexity",
    cacheKeyPrefix: "market:perplexity",
    cacheTtlEnvKey: "MARKET_DATA_CACHE_TTL_DAYS",
    cacheTtlFallbackDays: 30,
    async getMarketData(location) {
      return fetchPerplexityMarketData(location, {
        logger: deps.logger,
        now: deps.now
      });
    }
  };
}

function createRentCastProvider(
  deps: BaseProviderDeps
): MarketDataProviderStrategy {
  const rentCastTimeoutMs = getHttpTimeoutMs(deps.env, "RENTCAST_HTTP_TIMEOUT_MS");
  const fredTimeoutMs = getHttpTimeoutMs(
    deps.env,
    "FRED_HTTP_TIMEOUT_MS",
    rentCastTimeoutMs
  );

  return {
    name: "rentcast",
    displayName: "RentCast",
    cacheKeyPrefix: "rentcast",
    cacheTtlEnvKey: "RENTCAST_CACHE_TTL_DAYS",
    cacheTtlFallbackDays: 30,
    async getMarketData(location) {
      return fetchRentCastMarketData({
        location,
        rentCastApiKey: getApiKey(deps.env, "RENTCAST_API_KEY", deps.logger),
        fredApiKey: getApiKey(deps.env, "FRED_API_KEY", deps.logger),
        fetcher: deps.fetcher,
        now: deps.now,
        logger: deps.logger,
        env: deps.env,
        timeoutMs: rentCastTimeoutMs,
        fredTimeoutMs
      });
    }
  };
}

function getPrimaryProviderName(env: NodeJS.ProcessEnv): ProviderName {
  return env.MARKET_DATA_PROVIDER?.toLowerCase() === "rentcast"
    ? "rentcast"
    : "perplexity";
}

export function createMarketDataProviderRegistry(deps: BaseProviderDeps): {
  getProvider(name: ProviderName): MarketDataProviderStrategy;
  getProviderChain(): MarketDataProviderStrategy[];
} {
  const providers: Record<ProviderName, MarketDataProviderStrategy> = {
    perplexity: createPerplexityProvider(deps),
    rentcast: createRentCastProvider(deps)
  };

  const primary = getPrimaryProviderName(deps.env);
  const chain: MarketDataProviderStrategy[] =
    primary === "rentcast"
      ? [providers.rentcast]
      : [providers.perplexity, providers.rentcast];

  return {
    getProvider(name: ProviderName): MarketDataProviderStrategy {
      return providers[name];
    },
    getProviderChain(): MarketDataProviderStrategy[] {
      return chain;
    }
  };
}
