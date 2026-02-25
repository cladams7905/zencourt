import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import { ANTHROPIC_API_URL, ANTHROPIC_VERSION } from "./constants";
import type { AnthropicRequest, AnthropicTextPayload } from "./types";

const logger = createChildLogger(baseLogger, {
  module: "anthropic-client"
});

function getAnthropicApiKey(): string | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY is not configured");
    return null;
  }
  return apiKey;
}

export async function requestAnthropic(
  request: AnthropicRequest
): Promise<AnthropicTextPayload | null> {
  const apiKey = getAnthropicApiKey();
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
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    logger.warn(
      { status: response.status, errorPayload },
      "Anthropic request failed"
    );
    return null;
  }

  return (await response.json()) as AnthropicTextPayload;
}

export async function requestAnthropicStream(args: {
  request: AnthropicRequest;
  betaHeader?: string;
}): Promise<Response> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  return fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      ...(args.betaHeader ? { "anthropic-beta": args.betaHeader } : {})
    },
    body: JSON.stringify(args.request)
  });
}
