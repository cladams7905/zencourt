import {
  buildMarketDataXml,
  buildListingDataXml,
  buildOpenHouseContextXml,
  loadListingSubcategoryDirective
} from "@web/src/lib/ai/prompts/engine/dataPrompt";
import { readPromptFile } from "@web/src/lib/ai/prompts/engine/promptFileCache";

jest.mock("@web/src/lib/ai/prompts/engine/promptFileCache", () => {
  const actual = jest.requireActual(
    "@web/src/lib/ai/prompts/engine/promptFileCache"
  );
  return {
    ...actual,
    readPromptFile: jest.fn(
      async (relativePath: string) => `file:${relativePath}`
    )
  };
});

describe("dataPrompt", () => {
  it("builds market data xml and excludes non-meaningful values", () => {
    const xml = buildMarketDataXml({
      city: "Austin",
      state: "TX",
      zip_code: "78701",
      data_timestamp: "2026-02-18",
      market_summary: "Balanced market",
      median_home_price: "$500k",
      price_change_yoy: "N/A"
    } as never);

    expect(xml).toContain(
      '<market_data location="Austin, TX" zip_code="78701" as_of="2026-02-18">'
    );
    expect(xml).toContain("summary: Balanced market");
    expect(xml).toContain("median_home_price: $500k");
    expect(xml).not.toContain("price_change_yoy");
  });

  it("returns fallback listing xml when no data provided", () => {
    const xml = buildListingDataXml(null);
    expect(xml).toContain("No structured listing details were provided");
  });

  it("drops blocked listing keys and empty values", () => {
    const xml = buildListingDataXml({
      list_price: 750000,
      sources: ["should-drop"],
      sale_history: [{ price: 1 }],
      valuation_estimates: { est: 1 },
      features: ["pool", null, "garage"],
      nested: {
        keep: "yes",
        empty: null
      }
    } as never);

    expect(xml).toContain("```json");
    expect(xml).toContain('"list_price": 750000');
    expect(xml).toContain('"features": [');
    expect(xml).toContain('"pool"');
    expect(xml).toContain('"keep": "yes"');
    expect(xml).not.toContain("sources");
    expect(xml).not.toContain("sale_history");
    expect(xml).not.toContain("valuation_estimates");
    expect(xml).not.toContain('"empty": null');
  });

  it("loads listing subcategory directive when recognized", async () => {
    await expect(loadListingSubcategoryDirective("new_listing")).resolves.toBe(
      "file:listings/new-listing.md"
    );
    await expect(loadListingSubcategoryDirective("unknown")).resolves.toBe("");

    expect(readPromptFile).toHaveBeenCalledWith("listings/new-listing.md");
  });

  it("builds open house context block", () => {
    const xml = buildOpenHouseContextXml({
      hasAnyEvent: true,
      hasSchedule: true,
      selectedEvent: {
        date: "2026-03-01",
        startTime: "13:00",
        endTime: "15:00",
        dateLabel: "Mar 1st",
        timeLabel: "1-3PM",
        dateTimeLabel: "Mar 1st, 1-3PM"
      },
      openHouseDateTimeLabel: "Mar 1st, 1-3PM",
      openHouseOverlayLabel: "Mar 1st, 1-3PM",
      listingAddressLine: "123 Main St"
    });

    expect(xml).toContain("<open_house_context>");
    expect(xml).toContain("has_schedule: true");
    expect(xml).toContain("open_house_date_time_label: Mar 1st, 1-3PM");
  });
});
