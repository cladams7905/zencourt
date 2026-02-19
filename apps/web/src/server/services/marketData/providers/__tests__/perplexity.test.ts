const mockGenerateText = jest.fn();

jest.mock("@web/src/server/services/ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args)
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when perplexity response has no content", async () => {
    mockGenerateText.mockResolvedValue({ raw: { choices: [] } });

    await expect(fetchPerplexityMarketData(location, { logger, now })).resolves.toBeNull();
  });

  it("returns null and logs when JSON parsing fails", async () => {
    mockGenerateText.mockResolvedValue({
      raw: { choices: [{ message: { content: "not-json" } }] }
    });

    await expect(fetchPerplexityMarketData(location, { logger, now })).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("maps parsed payload and applies summary fallback/citations", async () => {
    mockGenerateText.mockResolvedValue({
      raw: {
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
      }
    });

    const result = await fetchPerplexityMarketData(location, { logger, now });

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
