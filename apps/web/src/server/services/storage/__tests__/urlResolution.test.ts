const mockIsUrlFromStorageEndpoint = jest.fn();
const mockGetPublicUrlForStorageUrl = jest.fn();

jest.mock("@shared/utils/storagePaths", () => ({
  isUrlFromStorageEndpoint: (...args: unknown[]) =>
    mockIsUrlFromStorageEndpoint(...args)
}));

jest.mock("@web/src/server/services/storage/service", () => ({
  __esModule: true,
  default: {
    getPublicUrlForStorageUrl: (...args: unknown[]) =>
      mockGetPublicUrlForStorageUrl(...args)
  }
}));

import {
  getPublicDownloadUrl,
  getPublicDownloadUrlSafe,
  getPublicDownloadUrls,
  isManagedStorageUrl,
  resolvePublicDownloadUrl
} from "@web/src/server/services/storage/urlResolution";

describe("storageUrls utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("detects managed URLs through shared helper", () => {
    mockIsUrlFromStorageEndpoint.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(isManagedStorageUrl("https://storage.example.com/a")).toBe(true);
    expect(isManagedStorageUrl("https://other.example.com/a")).toBe(false);
  });

  it("returns public CDN URL when storage resolves", () => {
    mockGetPublicUrlForStorageUrl.mockReturnValue(
      "https://cdn.example.com/bucket/folder/file.jpg"
    );

    expect(
      getPublicDownloadUrl("https://storage.example.com/bucket/folder/file.jpg")
    ).toBe("https://cdn.example.com/bucket/folder/file.jpg");
  });

  it("returns original URL when storage returns null", () => {
    mockGetPublicUrlForStorageUrl.mockReturnValue(null);

    expect(
      getPublicDownloadUrl("https://other.example.com/file.jpg")
    ).toBe("https://other.example.com/file.jpg");
  });

  it("returns empty string for empty input", () => {
    expect(getPublicDownloadUrl("")).toBe("");
  });

  it("getPublicDownloadUrlSafe returns undefined for empty input", () => {
    expect(getPublicDownloadUrlSafe(undefined)).toBeUndefined();
    expect(getPublicDownloadUrlSafe(null)).toBeUndefined();
    expect(getPublicDownloadUrlSafe("")).toBeUndefined();
  });

  it("getPublicDownloadUrlSafe returns public or original URL", () => {
    mockGetPublicUrlForStorageUrl
      .mockReturnValueOnce("https://cdn.example.com/a.jpg")
      .mockReturnValueOnce(null);
    expect(getPublicDownloadUrlSafe("https://storage.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg"
    );
    expect(getPublicDownloadUrlSafe("https://external.com/b.jpg")).toBe(
      "https://external.com/b.jpg"
    );
  });

  it("resolvePublicDownloadUrl returns null for empty input", () => {
    expect(resolvePublicDownloadUrl(undefined)).toBeNull();
    expect(resolvePublicDownloadUrl(null)).toBeNull();
    expect(resolvePublicDownloadUrl("")).toBeNull();
  });

  it("resolvePublicDownloadUrl returns public or original URL", () => {
    mockGetPublicUrlForStorageUrl
      .mockReturnValueOnce("https://cdn.example.com/c.jpg")
      .mockReturnValueOnce(null);
    expect(resolvePublicDownloadUrl("https://storage.example.com/c.jpg")).toBe(
      "https://cdn.example.com/c.jpg"
    );
    expect(resolvePublicDownloadUrl("https://external.com/d.jpg")).toBe(
      "https://external.com/d.jpg"
    );
  });

  it("getPublicDownloadUrls resolves multiple URLs", () => {
    mockGetPublicUrlForStorageUrl.mockImplementation((url: string) => {
      if (url.includes("1.jpg")) return "https://cdn.example.com/1.jpg";
      if (url.includes("3.jpg")) return "https://cdn.example.com/3.jpg";
      return null;
    });

    expect(
      getPublicDownloadUrls([
        "https://storage.example.com/1.jpg",
        "https://external.com/2.jpg",
        "https://storage.example.com/3.jpg"
      ])
    ).toEqual([
      "https://cdn.example.com/1.jpg",
      "https://external.com/2.jpg",
      "https://cdn.example.com/3.jpg"
    ]);
  });
});
