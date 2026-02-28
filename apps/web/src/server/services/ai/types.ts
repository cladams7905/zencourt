export type AIProviderName = "anthropic" | "perplexity";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIJsonSchemaFormat = {
  type: "json_schema";
  json_schema: {
    name?: string;
    schema: Record<string, unknown>;
  };
};

export type AITextRequest = {
  provider: AIProviderName;
  model?: string;
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  searchContextSize?: "low" | "medium" | "high";
  responseFormat?: AIJsonSchemaFormat;
};

export type AITextResult = {
  provider: AIProviderName;
  text: string | null;
  raw: unknown;
  citations?: Array<{
    title?: string;
    url?: string;
    source?: string;
  }>;
};

export type AIStructuredStreamRequest = {
  provider: Extract<AIProviderName, "anthropic">;
  model: string;
  system: string;
  messages: Array<{ role: "user"; content: string }>;
  maxTokens: number;
  outputFormat: unknown;
  betaHeader?: string;
};

export interface AITextStrategy {
  provider: AIProviderName;
  complete(request: AITextRequest): Promise<AITextResult | null>;
}

export interface AIStructuredStreamStrategy {
  provider: AIProviderName;
  stream(request: AIStructuredStreamRequest): Promise<Response>;
}
