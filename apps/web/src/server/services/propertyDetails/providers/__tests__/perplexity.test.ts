import { createPerplexityPropertyDetailsProvider } from "../perplexity";

describe("propertyDetails/providers/perplexity", () => {
  const mockRunStructuredPropertyQuery = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has name perplexity", () => {
    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    expect(perplexityPropertyDetailsProvider.name).toBe("perplexity");
  });

  it("calls injected perplexity generator with prompts", async () => {
    mockRunStructuredPropertyQuery.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ address: "123 Main" }) } }]
    });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    await perplexityPropertyDetailsProvider.fetch("123 Main St");

    expect(mockRunStructuredPropertyQuery).toHaveBeenCalledTimes(1);
    const call = mockRunStructuredPropertyQuery.mock.calls[0][0];
    expect(call.systemPrompt).toBeTruthy();
    expect(call.userPrompt).toContain("123 Main St");
    expect(call.responseFormat).toBeDefined();
    expect(
      call.responseFormat?.json_schema?.schema?.properties?.open_house_events
    ).toBeDefined();
  });

  it("returns parsed JSON from choices[0].message.content", async () => {
    const payload = { address: "456 Oak Ave", bedrooms: 3 };
    mockRunStructuredPropertyQuery.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(payload) } }]
    });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("456 Oak Ave");

    expect(result).toEqual(payload);
  });

  it("returns null when choices is empty", async () => {
    mockRunStructuredPropertyQuery.mockResolvedValue({ choices: [] });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("returns null when choices[0].message.content is missing", async () => {
    mockRunStructuredPropertyQuery.mockResolvedValue({
      choices: [{ message: {} }]
    });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("returns null when result.raw is undefined", async () => {
    mockRunStructuredPropertyQuery.mockResolvedValue(null);

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });
});
