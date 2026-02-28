const mockFetch = jest.fn();

const mockProvider = {
  name: "test",
  fetch: mockFetch
};
import { buildPropertyDetailsRevision } from "../revision";
import { fetchPropertyDetails } from "../fetch";

describe("listingProperty/domain", () => {
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
    await expect(fetchPropertyDetails("   ", mockProvider)).rejects.toThrow(
      "Address is required to fetch property details"
    );
  });

  it("returns null when provider returns null", async () => {
    mockFetch.mockResolvedValue(null);

    await expect(
      fetchPropertyDetails("123 Main St, Austin, TX", mockProvider)
    ).resolves.toBeNull();
  });

  it("parses and normalizes valid provider payload", async () => {
    mockFetch.mockResolvedValue({
      address: "123 Main St",
      bedrooms: "4",
      bathrooms: "2.5",
      living_spaces: ["Living Room", " "]
    });

    await expect(
      fetchPropertyDetails("123 Main St, Austin, TX", mockProvider)
    ).resolves.toEqual({
      address: "123 Main St",
      bedrooms: 4,
      bathrooms: 2.5,
      living_spaces: ["Living Room"]
    });
  });

  it("returns null for invalid payload content", async () => {
    mockFetch.mockResolvedValue("not-json");

    await expect(
      fetchPropertyDetails("123 Main St, Austin, TX", mockProvider)
    ).resolves.toBeNull();
  });

  it("drops open house events when no trusted IDX citations are present", async () => {
    mockFetch.mockResolvedValue({
      address: "123 Main St",
      open_house_events: [
        { date: "2026-03-01", start_time: "1:00 PM", end_time: "3:00 PM" }
      ],
      sources: [
        {
          site: "example.com",
          citation: "https://example.com/listing/123-main"
        }
      ]
    });

    await expect(
      fetchPropertyDetails("123 Main St, Austin, TX", mockProvider)
    ).resolves.toEqual({
      address: "123 Main St",
      open_house_events: null,
      sources: [
        {
          site: "example.com",
          notes: undefined,
          citation: "https://example.com/listing/123-main"
        }
      ]
    });
  });

  it("keeps open house events when trusted IDX citations are present", async () => {
    mockFetch.mockResolvedValue({
      address: "123 Main St",
      open_house_events: [
        { date: "2026-03-01", start_time: "1:00 PM", end_time: "3:00 PM" }
      ],
      sources: [
        {
          site: "zillow.com",
          citation: "https://www.zillow.com/homedetails/123-main/123_zpid/"
        }
      ]
    });

    await expect(
      fetchPropertyDetails("123 Main St, Austin, TX", mockProvider)
    ).resolves.toEqual({
      address: "123 Main St",
      open_house_events: [
        { date: "2026-03-01", start_time: "13:00", end_time: "15:00" }
      ],
      sources: [
        {
          site: "zillow.com",
          notes: undefined,
          citation: "https://www.zillow.com/homedetails/123-main/123_zpid/"
        }
      ]
    });
  });
});
