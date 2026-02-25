export type RunStructuredPropertyQuery = (args: {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: unknown;
}) => Promise<unknown | null>;

export type PropertyDetailsProvider = {
  name: string;
  fetch(address: string): Promise<unknown | null>;
};
