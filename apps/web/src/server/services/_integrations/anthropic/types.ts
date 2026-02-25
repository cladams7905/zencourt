export type AnthropicMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AnthropicTextPayload = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

export type AnthropicRequest = {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  stream?: boolean;
  output_format?: Record<string, unknown>;
};
