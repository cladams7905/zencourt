import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  requestAnthropic,
  requestAnthropicStream
} from "@web/src/server/services/_integrations/anthropic";
import { DEFAULT_AI_TEXT_MAX_TOKENS, DEFAULT_ANTHROPIC_MODEL } from "../config";
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

export const anthropicTextStrategy: AITextStrategy = {
  provider: "anthropic",
  async complete(request: AITextRequest): Promise<AITextResult | null> {
    const payload = await requestAnthropic({
      model: request.model ?? DEFAULT_ANTHROPIC_MODEL,
      max_tokens: request.maxTokens ?? DEFAULT_AI_TEXT_MAX_TOKENS,
      ...(request.system ? { system: request.system } : {}),
      messages: request.messages
    });
    if (!payload) {
      return null;
    }
    const text =
      payload.content?.find((item) => item.type === "text")?.text ?? null;

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
    return requestAnthropicStream({
      betaHeader: request.betaHeader,
      request: {
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        stream: true,
        output_format: request.outputFormat as Record<string, unknown> | undefined
      }
    }).catch((error) => {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Anthropic stream request failed"
      );
      throw error;
    });
  }
};
