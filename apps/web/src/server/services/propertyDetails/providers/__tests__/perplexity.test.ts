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
    mockRunStructuredPropertyQuery
      .mockResolvedValueOnce({
        citations: [
          "https://www.zillow.com/homedetails/123-main/1_zpid/",
          "https://www.redfin.com/VA/Test/123-Main-St/home/1"
        ],
        search_results: [
          {
            url: "https://www.realtor.com/realestateandhomes-detail/123-Main-St_Test_VA_00000_M00000-00000"
          }
        ],
        choices: [
          {
            message: {
              content: JSON.stringify({
                address: "123 Main",
                sources: [
                  {
                    site: "zillow.com",
                    citation: "https://www.zillow.com/homedetails/123-main/1_zpid/"
                  }
                ]
              })
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ open_house_events: [], sources: [] }) } }]
      });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    await perplexityPropertyDetailsProvider.fetch("123 Main St");

    expect(mockRunStructuredPropertyQuery).toHaveBeenCalledTimes(2);
    const primaryCall = mockRunStructuredPropertyQuery.mock.calls[0][0];
    expect(primaryCall.systemPrompt).toBeTruthy();
    expect(primaryCall.userPrompt).toContain("123 Main St");
    expect(primaryCall.responseFormat).toBeDefined();
    expect(
      primaryCall.responseFormat?.json_schema?.schema?.properties?.open_house_events
    ).toBeDefined();

    const openHouseCall = mockRunStructuredPropertyQuery.mock.calls[1][0];
    expect(openHouseCall.systemPrompt).toContain("open house schedules");
    expect(openHouseCall.userPrompt).toContain(
      "Are there any open houses for 123 Main St?"
    );
  });

  it("returns parsed JSON from choices[0].message.content", async () => {
    const payload = { address: "456 Oak Ave", bedrooms: 3 };
    mockRunStructuredPropertyQuery
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(payload) } }]
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ open_house_events: [], sources: [] }) } }]
      });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("456 Oak Ave");

    expect(result).toEqual({ ...payload, open_house_events: [] });
  });

  it("returns null when choices is empty", async () => {
    mockRunStructuredPropertyQuery.mockResolvedValueOnce({ choices: [] });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("returns null when choices[0].message.content is missing", async () => {
    mockRunStructuredPropertyQuery
      .mockResolvedValueOnce({
        choices: [{ message: {} }]
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ open_house_events: [], sources: [] }) } }]
      });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("returns null when result.raw is undefined", async () => {
    mockRunStructuredPropertyQuery
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ open_house_events: [], sources: [] }) } }]
      });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toBeNull();
  });

  it("prefers open-house events from fallback query output", async () => {
    mockRunStructuredPropertyQuery
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ address: "789 Pine", open_house_events: [] }) } }]
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                open_house_events: [
                  { date: "2026-03-01", start_time: "1:00 PM", end_time: "3:00 PM" }
                ],
                sources: [{ site: "zillow.com", citation: "https://www.zillow.com/example" }]
              })
            }
          }
        ]
      });

    const perplexityPropertyDetailsProvider = createPerplexityPropertyDetailsProvider({
      runStructuredQuery: mockRunStructuredPropertyQuery
    });
    const result = await perplexityPropertyDetailsProvider.fetch("789 Pine Rd");

    expect(result).toEqual(
      expect.objectContaining({
        address: "789 Pine",
        open_house_events: [
          { date: "2026-03-01", start_time: "1:00 PM", end_time: "3:00 PM" }
        ]
      })
    );
  });
});
