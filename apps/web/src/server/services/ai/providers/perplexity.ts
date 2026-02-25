import { requestPerplexity } from "@web/src/server/services/_integrations/perplexity";
import type { PerplexityChatCompletionResponse } from "@web/src/server/services/_integrations/perplexity";
import type { AITextRequest, AITextResult, AITextStrategy } from "../types";

export const perplexityTextStrategy: AITextStrategy = {
  provider: "perplexity",
  async complete(request: AITextRequest): Promise<AITextResult | null> {
    const raw = (await requestPerplexity({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      response_format: request.responseFormat
    })) as PerplexityChatCompletionResponse | null;

    if (!raw) {
      return null;
    }

    return {
      provider: "perplexity",
      text: raw.choices?.[0]?.message?.content ?? null,
      raw,
      citations: (raw.search_results ?? []).map((result) => ({
        title: result.title,
        url: result.url,
        source: result.source ?? result.date
      }))
    };
  }
};
