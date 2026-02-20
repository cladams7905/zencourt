import {
  buildPerplexityCategorySchema,
  buildPerplexityResponseFormat
} from "@web/src/server/services/communityData/providers/perplexity/transport/schema";

describe("perplexity schema", () => {
  type SchemaProperties = Record<string, unknown>;
  const getItemProperties = (schema: unknown): SchemaProperties => {
    return (
      schema as {
        properties: { items: { items: { properties: SchemaProperties } } };
      }
    ).properties.items.items.properties;
  };

  it("includes cuisine only for dining and coffee", () => {
    const dining = buildPerplexityCategorySchema("dining");
    const nature = buildPerplexityCategorySchema("nature_outdoors");

    const diningProps = getItemProperties(dining);
    const natureProps = getItemProperties(nature);

    expect(diningProps.cuisine).toBeDefined();
    expect(natureProps.cuisine).toBeUndefined();
    expect(natureProps.disclaimer).toBeDefined();
  });

  it("uses audience-specific why field and response format name", () => {
    const schema = buildPerplexityCategorySchema("dining", "growing_families");
    const props = getItemProperties(schema);
    expect(props.why_suitable_for_growing_families).toBeDefined();

    const responseFormat = buildPerplexityResponseFormat(
      "dining",
      "growing_families"
    );
    expect(responseFormat.json_schema.name).toBe("community_dining");
  });
});
