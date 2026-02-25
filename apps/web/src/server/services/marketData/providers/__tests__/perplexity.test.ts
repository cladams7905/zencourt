import { fetchPerplexityMarketData } from "../perplexity";

describe("marketData/providers/perplexity", () => {
  const location = {
    city: "Austin",
    state: "TX",
    zip_code: "73301"
  };
  const logger = {
    warn: jest.fn()
  };
  const now = () => new Date("2026-02-18T00:00:00.000Z");
  const runStructuredMarketQuery = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when perplexity response has no content", async () => {
    runStructuredMarketQuery.mockResolvedValue({ choices: [] });

    await expect(
      fetchPerplexityMarketData(location, { logger, now, runStructuredMarketQuery })
    ).resolves.toBeNull();
  });

  it("returns null and logs when JSON parsing fails", async () => {
    runStructuredMarketQuery.mockResolvedValue({
      choices: [{ message: { content: "not-json" } }]
    });

    await expect(
      fetchPerplexityMarketData(location, { logger, now, runStructuredMarketQuery })
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("maps parsed payload and applies summary fallback/citations", async () => {
    runStructuredMarketQuery.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              data_timestamp: "",
              median_home_price: "$500,000",
              price_change_yoy: "4.2%",
              active_listings: "120",
              months_of_supply: "2.4 months",
              avg_dom: "35",
              sale_to_list_ratio: "98%",
              median_rent: "$2,500",
              rent_change_yoy: "3.1%",
              rate_30yr: "6.4%",
              estimated_monthly_payment: "$3,200",
              median_household_income: "$95,000",
              affordability_index: "88",
              entry_level_price: "$350,000",
              entry_level_payment: "$2,400",
              market_summary: " "
            })
          }
        }
      ],
      search_results: [
        { title: "Source A", url: "https://a.example.com", source: "A" },
        { title: "", url: "", source: "" }
      ]
    });

    const result = await fetchPerplexityMarketData(location, {
      logger,
      now,
      runStructuredMarketQuery
    });

    expect(result).toEqual(
      expect.objectContaining({
        data_timestamp: "2026-02-18T00:00:00.000Z",
        median_home_price: "$500,000",
        market_summary: expect.stringContaining("Austin home prices are around"),
        citations: [{ title: "Source A", url: "https://a.example.com", source: "A" }]
      })
    );
  });
});
