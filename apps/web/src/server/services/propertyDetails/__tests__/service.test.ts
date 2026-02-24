const mockFetch = jest.fn();

const mockProvider = {
  name: "test",
  fetch: mockFetch
};

jest.mock("@db/client", () => ({
  db: { select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }) },
  eq: (...args: unknown[]) => args,
  listings: {}
}));

jest.mock("../providers", () => ({
  getDefaultPropertyDetailsProvider: () => mockProvider
}));

import {
  buildPropertyDetailsRevision,
  fetchPropertyDetails
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
    await expect(
      fetchPropertyDetails("   ", mockProvider)
    ).rejects.toThrow("Address is required to fetch property details");
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
});
