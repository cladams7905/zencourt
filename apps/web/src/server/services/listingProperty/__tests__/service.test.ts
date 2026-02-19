const mockGenerateText = jest.fn();

jest.mock("@web/src/server/services/ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args)
}));

import {
  buildPropertyDetailsRevision,
  fetchPropertyDetailsFromPerplexity
} from "../service";

describe("listingProperty/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates stable revisions for identical payloads", () => {
    const first = buildPropertyDetailsRevision({
      address: "123 Main St",
      bedrooms: 4
    });
    const second = buildPropertyDetailsRevision({
      address: "123 Main St",
      bedrooms: 4
    });

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });

  it("throws when address is empty", async () => {
    await expect(fetchPropertyDetailsFromPerplexity("   ")).rejects.toThrow(
      "Address is required to fetch property details"
    );
  });

  it("returns null when perplexity response has no choices", async () => {
    mockGenerateText.mockResolvedValue({ raw: { choices: [] } });

    await expect(
      fetchPropertyDetailsFromPerplexity("123 Main St, Austin, TX")
    ).resolves.toBeNull();
  });

  it("parses and normalizes valid perplexity payload content", async () => {
    mockGenerateText.mockResolvedValue({
      raw: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                address: "123 Main St",
                bedrooms: "4",
                bathrooms: "2.5",
                living_spaces: ["Living Room", " "]
              })
            }
          }
        ]
      }
    });

    await expect(
      fetchPropertyDetailsFromPerplexity("123 Main St, Austin, TX")
    ).resolves.toEqual({
      address: "123 Main St",
      bedrooms: 4,
      bathrooms: 2.5,
      living_spaces: ["Living Room"]
    });
  });

  it("returns null for invalid payload content", async () => {
    mockGenerateText.mockResolvedValue({
      raw: {
        choices: [
          {
            message: {
              content: "not-json"
            }
          }
        ]
      }
    });

    await expect(
      fetchPropertyDetailsFromPerplexity("123 Main St, Austin, TX")
    ).resolves.toBeNull();
  });
});
