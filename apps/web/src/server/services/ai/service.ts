import type {
  AIStructuredStreamRequest,
  AITextRequest,
  AITextResult
} from "./types";

export async function generateText(
  request: AITextRequest
): Promise<AITextResult | null> {
  if (request.provider === "anthropic") {
    const { anthropicTextStrategy } = await import("./providers/anthropic");
    return anthropicTextStrategy.complete(request);
  }
  if (request.provider === "perplexity") {
    const { perplexityTextStrategy } = await import("./providers/perplexity");
    return perplexityTextStrategy.complete(request);
  }
  throw new Error(
    `No text strategy registered for provider: ${request.provider}`
  );
}

export async function generateStructuredStream(
  request: AIStructuredStreamRequest
): Promise<Response> {
  if (request.provider === "anthropic") {
    const { anthropicStructuredStreamStrategy } =
      await import("./providers/anthropic");
    return anthropicStructuredStreamStrategy.stream(request);
  }
  throw new Error(
    `No structured stream strategy registered for provider: ${request.provider}`
  );
}
