import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import {
  PERPLEXITY_API_URL,
  PERPLEXITY_DEFAULT_MODEL,
  PERPLEXITY_MAX_TOKENS,
  PERPLEXITY_TEMPERATURE,
  PERPLEXITY_TIMEOUT_MS
} from "./constants";
import type {
  PerplexityChatCompletionResponse,
  PerplexityRequest
} from "./types";
import {
  getExponentialBackoffDelayMs,
  isRetryableHttpStatus,
  sleep
} from "@web/src/server/utils/retry";

const logger = createChildLogger(baseLogger, {
  module: "perplexity-client"
});

type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 2000
};

function getPerplexityApiKey(): string | null {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    logger.warn("PERPLEXITY_API_KEY is not configured");
    return null;
  }
  return apiKey;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || !isRetryableHttpStatus(response.status)) {
        return response;
      }
      logger.warn(
        { url, status: response.status, attempt, maxAttempts: config.maxAttempts },
        "Retryable Perplexity response"
      );
      if (attempt < config.maxAttempts) {
        const delay = getExponentialBackoffDelayMs(
          attempt,
          config.baseDelayMs,
          config.maxDelayMs
        );
        await sleep(delay);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        { url, error: lastError.message, attempt, maxAttempts: config.maxAttempts },
        "Retryable Perplexity fetch error"
      );
      if (attempt < config.maxAttempts) {
        const delay = getExponentialBackoffDelayMs(
          attempt,
          config.baseDelayMs,
          config.maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  if (lastError) {
    logger.error(
      { url, error: lastError.message, maxAttempts: config.maxAttempts },
      "Exhausted Perplexity retries"
    );
    throw lastError;
  }

  logger.error({ url, maxAttempts: config.maxAttempts }, "Exhausted retries");
  return new Response(null, { status: 503 });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = PERPLEXITY_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchWithRetry(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function requestPerplexity(
  request: Omit<PerplexityRequest, "model"> & { model?: string }
): Promise<PerplexityChatCompletionResponse | null> {
  const apiKey = getPerplexityApiKey();
  if (!apiKey) {
    return null;
  }

  const payload: PerplexityRequest = {
    model: request.model ?? PERPLEXITY_DEFAULT_MODEL,
    messages: request.messages,
    temperature: request.temperature ?? PERPLEXITY_TEMPERATURE,
    max_tokens: request.max_tokens ?? PERPLEXITY_MAX_TOKENS,
    response_format: request.response_format
  };

  try {
    const response = await fetchWithTimeout(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      logger.warn(
        { status: response.status, errorPayload },
        "Perplexity request failed"
      );
      return null;
    }

    return (await response.json()) as PerplexityChatCompletionResponse;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Perplexity request failed"
    );
    return null;
  }
}
