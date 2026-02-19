import {
  CommunityDataProvider,
  getCommunityDataProvider
} from "@web/src/server/services/communityData/config";
import type { AIProviderName } from "./types";

export type AIUseCase =
  | "content_generation_stream"
  | "city_description"
  | "listing_property"
  | "market_data";

export type AIUseCaseConfig = {
  provider: AIProviderName;
  model?: string;
  maxTokens: number;
  temperature?: number;
  betaHeader?: string;
};

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const DEFAULT_AI_TEXT_MAX_TOKENS = 512;
export const DEFAULT_CONTENT_STREAM_MAX_TOKENS = 2800;
export const DEFAULT_CITY_DESCRIPTION_MAX_TOKENS = 160;
export const DEFAULT_LISTING_PROPERTY_MAX_TOKENS = 900;
export const DEFAULT_MARKET_DATA_MAX_TOKENS = 900;
export const DEFAULT_CONTENT_STREAM_BETA_HEADER =
  "structured-outputs-2025-11-13";

const DEFAULTS: Record<AIUseCase, AIUseCaseConfig> = {
  content_generation_stream: {
    provider: "anthropic",
    model: DEFAULT_ANTHROPIC_MODEL,
    maxTokens: DEFAULT_CONTENT_STREAM_MAX_TOKENS,
    betaHeader: DEFAULT_CONTENT_STREAM_BETA_HEADER
  },
  city_description: {
    provider: "anthropic",
    model: DEFAULT_ANTHROPIC_MODEL,
    maxTokens: DEFAULT_CITY_DESCRIPTION_MAX_TOKENS
  },
  listing_property: {
    provider: "perplexity",
    maxTokens: DEFAULT_LISTING_PROPERTY_MAX_TOKENS
  },
  market_data: {
    provider: "perplexity",
    maxTokens: DEFAULT_MARKET_DATA_MAX_TOKENS
  }
};

function toEnvSuffix(useCase: AIUseCase): string {
  return useCase.toUpperCase();
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseProvider(value: string | undefined): AIProviderName | undefined {
  if (value === "anthropic" || value === "perplexity") {
    return value;
  }
  return undefined;
}

function resolveCityDescriptionProviderFallback(): AIProviderName {
  return getCommunityDataProvider() === CommunityDataProvider.Perplexity
    ? "perplexity"
    : "anthropic";
}

export function getAiUseCaseConfig(useCase: AIUseCase): AIUseCaseConfig {
  const base = DEFAULTS[useCase];
  const suffix = toEnvSuffix(useCase);

  const providerOverride = parseProvider(
    process.env[`AI_${suffix}_PROVIDER`] ?? process.env.AI_PROVIDER
  );
  const modelOverride =
    process.env[`AI_${suffix}_MODEL`] ?? process.env.AI_MODEL ?? undefined;
  const maxTokensOverride = parseOptionalNumber(
    process.env[`AI_${suffix}_MAX_TOKENS`] ?? process.env.AI_MAX_TOKENS
  );
  const temperatureOverride = parseOptionalNumber(
    process.env[`AI_${suffix}_TEMPERATURE`] ?? process.env.AI_TEMPERATURE
  );
  const betaHeaderOverride =
    process.env[`AI_${suffix}_BETA_HEADER`] ?? undefined;

  const provider =
    providerOverride ??
    (useCase === "city_description"
      ? resolveCityDescriptionProviderFallback()
      : base.provider);

  return {
    provider,
    model: modelOverride ?? base.model,
    maxTokens: maxTokensOverride ?? base.maxTokens,
    temperature: temperatureOverride ?? base.temperature,
    betaHeader: betaHeaderOverride ?? base.betaHeader
  };
}
