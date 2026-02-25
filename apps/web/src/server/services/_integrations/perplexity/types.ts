export type PerplexityMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PerplexityCitationDraft = {
  title?: string;
  url?: string;
  source?: string;
};

export type PerplexityPlaceDraft = {
  name?: string;
  location?: string;
  drive_distance_minutes?: number;
  dates?: string;
  description?: string;
  cost?: string;
  why_suitable_for_audience?: string;
  cuisine?: string[];
  disclaimer?: string;
  citations?: PerplexityCitationDraft[];
};

export type PerplexityCategoryResponse = {
  items: PerplexityPlaceDraft[];
};

export type PerplexitySearchResult = {
  title?: string;
  url?: string;
  source?: string;
  date?: string;
};

export type PerplexityChatCompletionChoice = {
  message?: {
    role?: string;
    content?: string;
  };
};

export type PerplexityChatCompletionResponse = {
  id?: string;
  choices?: PerplexityChatCompletionChoice[];
  search_results?: PerplexitySearchResult[];
};

export type PerplexityResponseFormat = {
  type: "json_schema";
  json_schema: {
    name?: string;
    schema: Record<string, unknown>;
  };
};

export type PerplexityRequest = {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: PerplexityResponseFormat;
};
