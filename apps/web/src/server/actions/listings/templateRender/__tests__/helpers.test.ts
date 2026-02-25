/** @jest-environment node */

const mockGetPublicUrlForStorageUrl = jest.fn();

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getPublicUrlForStorageUrl: (...args: unknown[]) =>
      (mockGetPublicUrlForStorageUrl as (...a: unknown[]) => unknown)(...args)
  }
}));

import { resolveListingImagesToPublicUrls } from "@web/src/server/actions/listings/templateRender/helpers";

describe("templateRender/helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replaces urls with public urls when available", () => {
    mockGetPublicUrlForStorageUrl
      .mockReturnValueOnce("https://cdn.example.com/1.jpg")
      .mockReturnValueOnce(null);

    const result = resolveListingImagesToPublicUrls([
      { id: "1", url: "https://signed.example.com/1.jpg" },
      { id: "2", url: "https://signed.example.com/2.jpg" }
    ]);

    expect(result).toEqual([
      { id: "1", url: "https://cdn.example.com/1.jpg" },
      { id: "2", url: "https://signed.example.com/2.jpg" }
    ]);
  });
});

