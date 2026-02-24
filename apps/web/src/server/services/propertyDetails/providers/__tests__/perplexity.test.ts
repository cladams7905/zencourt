const mockGenerateText = jest.fn();

jest.mock("@web/src/server/services/ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args)
}));

import { perplexityPropertyDetailsProvider } from "../perplexity";

describe("propertyDetails/providers/perplexity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has name perplexity", () => {
    expect(perplexityPropertyDetailsProvider.name).toBe("perplexity");
  });

  it("calls generateText with provider perplexity and prompts", async () => {
    mockGenerateText.mockResolvedValue({
      raw: {
        choices: [{ message: { content: JSON.stringify({ address: "123 Main" }) } }]
      }
    });

    await perplexityPropertyDetailsProvider.fetch("123 Main St");

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const call = mockGenerateText.mock.calls[0][0];
    expect(call.provider).toBe("perplexity");
    expect(call.messages).toHaveLength(2);
    expect(call.messages[0].role).toBe("system");
    expect(call.messages[1].role).toBe("user");
    expect(call.messages[1].content).toContain("123 Main St");
    expect(call.responseFormat).toBeDefined();
    expect(call.responseFormat.type).toBe("json_schema");
  });

  it("returns parsed JSON from choices[0].message.content", async () => {
    const payload = { address: "456 Oak Ave", bedrooms: 3 };
    mockGenerateText.mockResolvedValue({
      raw: {
        choices: [{ message: { content: JSON.stringify(payload) } }]
      }
    });

    const result = await perplexityPropertyDetailsProvider.fetch("456 Oak Ave");

    expect(result).toEqual(payload);
  });

  it("returns null when choices is empty", async () => {
    mockGenerateText.mockResolvedValue({ raw: { choices: [] } });

    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("returns null when choices[0].message.content is missing", async () => {
    mockGenerateText.mockResolvedValue({
      raw: { choices: [{ message: {} }] }
    });

    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("returns null when result.raw is undefined", async () => {
    mockGenerateText.mockResolvedValue(null);

    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });
});
