import { fetchApiData } from "@web/src/lib/core/http/client";
import {
  buildListingContentItemsPageKey,
  buildListingContentItemsPageUrl,
  fetchListingContentItemsPage
} from "../client";

jest.mock("@web/src/lib/core/http/client", () => ({
  fetchApiData: jest.fn()
}));

const mockFetchApiData = jest.mocked(fetchApiData);

describe("listingContentDataClient", () => {
  beforeEach(() => {
    mockFetchApiData.mockReset();
  });

  it("builds the base content page key when no params are provided", () => {
    expect(buildListingContentItemsPageKey("listing-1", {})).toBe(
      "/api/v1/listings/listing-1/content"
    );
  });

  it("builds the content page key with all supported query params", () => {
    expect(
      buildListingContentItemsPageKey("listing-1", {
        mediaTab: "images",
        subcategory: "new_listing",
        limit: 24,
        offset: 48
      })
    ).toBe(
      "/api/v1/listings/listing-1/content?mediaTab=images&subcategory=new_listing&limit=24&offset=48"
    );
  });

  it("exports the page url builder as an alias of the page key builder", () => {
    expect(buildListingContentItemsPageUrl).toBe(buildListingContentItemsPageKey);
  });

  it("fetches the content page through fetchApiData with the expected key and error message", async () => {
    const page = {
      items: [{ id: "item-1" }],
      total: 1,
      limit: 10,
      offset: 0
    };
    mockFetchApiData.mockResolvedValue(page as never);

    await expect(
      fetchListingContentItemsPage("listing-2", {
        mediaTab: "videos",
        limit: 10,
        offset: 0
      })
    ).resolves.toEqual(page);

    expect(mockFetchApiData).toHaveBeenCalledWith(
      "/api/v1/listings/listing-2/content?mediaTab=videos&limit=10&offset=0",
      undefined,
      "Failed to load listing content."
    );
  });
});
