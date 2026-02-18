import {
  buildCommunityCategoryPayload,
  parsePerplexityCategoryJson
} from "@web/src/server/services/community/providers/perplexity/pipeline/parsing";

describe("perplexity parsing", () => {
  it("parses wrapped json payload", () => {
    const parsed = parsePerplexityCategoryJson(
      JSON.stringify({ items: [{ name: "Cafe" }] }),
      "growing_families"
    );
    expect(parsed?.items[0].name).toBe("Cafe");
  });

  it("returns null for invalid payload", () => {
    expect(parsePerplexityCategoryJson("not-json")).toBeNull();
  });

  it("builds community payload and filters city-as-neighborhood items", () => {
    const response = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { name: "Austin" },
                { name: "Mueller", description: "Neighborhood" }
              ]
            })
          }
        }
      ],
      search_results: [{ title: "source", url: "https://example.com" }]
    };

    const payload = buildCommunityCategoryPayload({
      category: "neighborhoods",
      zipCode: "78701",
      city: "Austin",
      state: "TX",
      response: response as never
    });

    expect(payload).not.toBeNull();
    expect(payload?.items).toHaveLength(1);
    expect(payload?.items[0].name).toBe("Mueller");
  });

  it("parses array payloads and strips invalid items", () => {
    const parsed = parsePerplexityCategoryJson(
      JSON.stringify([{ name: "" }, { name: "Park" }]),
      "growing_families"
    );
    expect(parsed?.items).toEqual([expect.objectContaining({ name: "Park" })]);
  });

  it("returns null when response choice content is missing", () => {
    const payload = buildCommunityCategoryPayload({
      category: "dining",
      zipCode: "78701",
      response: { choices: [{ message: {} }] } as never
    });
    expect(payload).toBeNull();
  });

  it("uses fallback citations and category-specific fields", () => {
    const response = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: "Trail",
                  disclaimer: "Weather dependent"
                }
              ]
            })
          }
        }
      ],
      search_results: [{ title: "source", url: "https://example.com" }]
    };

    const payload = buildCommunityCategoryPayload({
      category: "nature_outdoors",
      zipCode: "78701",
      response: response as never,
      maxItems: 1
    });

    expect(payload?.items).toHaveLength(1);
    expect(payload?.items[0].disclaimer).toBe("Weather dependent");
    expect(payload?.items[0].citations).toEqual([
      expect.objectContaining({ title: "source" })
    ]);
  });

  it("keeps cuisine only for dining/coffee and rounds drive time", () => {
    const response = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: "Cafe",
                  cuisine: ["coffee"],
                  drive_distance_minutes: 12.7
                }
              ]
            })
          }
        }
      ]
    };

    const dining = buildCommunityCategoryPayload({
      category: "dining",
      zipCode: "78701",
      response: response as never
    });
    const entertainment = buildCommunityCategoryPayload({
      category: "entertainment",
      zipCode: "78701",
      response: response as never
    });

    expect(dining?.items[0].cuisine).toEqual(["coffee"]);
    expect(dining?.items[0].drive_distance_minutes).toBe(13);
    expect(entertainment?.items[0].cuisine).toBeUndefined();
  });

  it("filters neighborhood variants of city/state names", () => {
    const response = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { name: "Austin" },
                { name: "Austin, tx" },
                { name: "Austin tx" },
                { name: "Hyde Park" }
              ]
            })
          }
        }
      ]
    };

    const payload = buildCommunityCategoryPayload({
      category: "neighborhoods",
      zipCode: "78701",
      city: "Austin",
      state: "TX",
      response: response as never
    });

    expect(payload?.items.map((item) => item.name)).toEqual(["Hyde Park"]);
  });
});
