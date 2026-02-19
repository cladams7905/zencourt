import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  DEFAULT_AI_TEXT_MAX_TOKENS,
  DEFAULT_ANTHROPIC_MODEL
} from "../config";
import type {
  AIStructuredStreamRequest,
  AIStructuredStreamStrategy,
  AITextRequest,
  AITextResult,
  AITextStrategy
} from "../types";

const logger = createChildLogger(baseLogger, {
  module: "ai-strategy-anthropic"
});

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function getApiKey(): string | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY is not configured");
    return null;
  }
  return apiKey;
}

type AnthropicTextPayload = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

export const anthropicTextStrategy: AITextStrategy = {
  provider: "anthropic",
  async complete(request: AITextRequest): Promise<AITextResult | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
      return null;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: request.model ?? DEFAULT_ANTHROPIC_MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_AI_TEXT_MAX_TOKENS,
        ...(request.system ? { system: request.system } : {}),
        messages: request.messages
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      logger.warn(
        { status: response.status, errorPayload },
        "Anthropic request failed"
      );
      return null;
    }

    const payload = (await response.json()) as AnthropicTextPayload;
    const text = payload.content?.find((item) => item.type === "text")?.text ?? null;

    return {
      provider: "anthropic",
      text,
      raw: payload
    };
  }
};

export const anthropicStructuredStreamStrategy: AIStructuredStreamStrategy = {
  provider: "anthropic",
  async stream(request: AIStructuredStreamRequest): Promise<Response> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    return fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        ...(request.betaHeader ? { "anthropic-beta": request.betaHeader } : {})
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        stream: true,
        output_format: request.outputFormat
      })
    });
  }
};
