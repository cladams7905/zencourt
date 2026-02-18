import {
  buildPerplexityCategorySchema,
  buildPerplexityResponseFormat
} from "@web/src/server/services/community/providers/perplexity/transport/schema";

describe("perplexity schema", () => {
  it("includes cuisine only for dining and coffee", () => {
    const dining = buildPerplexityCategorySchema("dining");
    const nature = buildPerplexityCategorySchema("nature_outdoors");

    const diningProps = (dining as any).properties.items.items.properties;
    const natureProps = (nature as any).properties.items.items.properties;

    expect(diningProps.cuisine).toBeDefined();
    expect(natureProps.cuisine).toBeUndefined();
    expect(natureProps.disclaimer).toBeDefined();
  });

  it("uses audience-specific why field and response format name", () => {
    const schema = buildPerplexityCategorySchema("dining", "growing_families") as any;
    const props = schema.properties.items.items.properties;
    expect(props.why_suitable_for_growing_families).toBeDefined();

    const responseFormat = buildPerplexityResponseFormat("dining", "growing_families");
    expect(responseFormat.json_schema.name).toBe("community_dining");
  });
});
