import {
  buildListingsPageUrl,
  fetchListingsPage
} from "@web/src/components/listings/my-listings/domain/services/listingsService";

describe("listingsService", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    (global.fetch as unknown as jest.Mock).mockReset();
  });

  it("maps the current wire response into an offset page with nextOffset", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "listing-3",
            title: "Three",
            listingStage: "review",
            lastOpenedAt: null,
            imageCount: 0,
            previewImages: []
          },
          {
            id: "listing-4",
            title: "Four",
            listingStage: "review",
            lastOpenedAt: null,
            imageCount: 0,
            previewImages: []
          }
        ],
        hasMore: true
      })
    });

    const result = await fetchListingsPage(
      buildListingsPageUrl({ offset: 6, limit: 2 })
    );

    expect(result).toEqual({
      items: [
        expect.objectContaining({ id: "listing-3" }),
        expect.objectContaining({ id: "listing-4" })
      ],
      hasMore: true,
      nextOffset: 8
    });
  });

  it("falls back to offset zero when the url offset is invalid", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "listing-1", previewImages: [] }],
        hasMore: false
      })
    });

    await expect(
      fetchListingsPage("/api/v1/listings?offset=not-a-number&limit=2")
    ).resolves.toEqual({
      items: [expect.objectContaining({ id: "listing-1" })],
      hasMore: false,
      nextOffset: 1
    });
  });

  it("throws a stable error when the fetch fails", async () => {
    (global.fetch as unknown as jest.Mock).mockRejectedValue(new Error("boom"));

    await expect(
      fetchListingsPage(buildListingsPageUrl({ offset: 0, limit: 10 }))
    ).rejects.toThrow("Failed to load more listings.");
  });
});
