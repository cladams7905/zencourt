import { getAiUseCaseConfig, type AIUseCase } from "./config";
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

export async function generateTextForUseCase(args: {
  useCase: AIUseCase;
  system?: string;
  messages: AITextRequest["messages"];
  responseFormat?: AITextRequest["responseFormat"];
}): Promise<AITextResult | null> {
  const config = getAiUseCaseConfig(args.useCase);
  return generateText({
    provider: config.provider,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    searchContextSize: config.searchContextSize,
    system: args.system,
    messages: args.messages,
    responseFormat: args.responseFormat
  });
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

export async function generateStructuredStreamForUseCase(args: {
  useCase: AIUseCase;
  system: string;
  messages: AIStructuredStreamRequest["messages"];
  outputFormat: AIStructuredStreamRequest["outputFormat"];
}): Promise<Response> {
  const config = getAiUseCaseConfig(args.useCase);
  if (config.provider !== "anthropic") {
    throw new Error(
      `Structured stream provider is not supported for use case: ${args.useCase}`
    );
  }
  if (!config.model) {
    throw new Error(`Missing AI model for structured stream use case: ${args.useCase}`);
  }
  return generateStructuredStream({
    provider: "anthropic",
    model: config.model,
    maxTokens: config.maxTokens,
    system: args.system,
    messages: args.messages,
    outputFormat: args.outputFormat,
    betaHeader: config.betaHeader
  });
}
