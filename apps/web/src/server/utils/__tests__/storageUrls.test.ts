const mockGetSignedDownloadUrl = jest.fn();
const mockIsUrlFromStorageEndpoint = jest.fn();
const mockExtractStorageKeyFromUrl = jest.fn();

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getSignedDownloadUrl: (...args: unknown[]) => mockGetSignedDownloadUrl(...args)
  }
}));

jest.mock("@shared/utils/storagePaths", () => ({
  isUrlFromStorageEndpoint: (...args: unknown[]) => mockIsUrlFromStorageEndpoint(...args),
  extractStorageKeyFromUrl: (...args: unknown[]) => mockExtractStorageKeyFromUrl(...args)
}));

import {
  getSignedDownloadUrl,
  getSignedDownloadUrlSafe,
  getSignedDownloadUrls,
  isManagedStorageUrl,
  resolveSignedDownloadUrl
} from "@web/src/server/utils/storageUrls";

describe("storageUrls utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsUrlFromStorageEndpoint.mockReturnValue(true);
    mockExtractStorageKeyFromUrl.mockImplementation((url: string) =>
      url.replace("https://storage.example.com/bucket/", "")
    );
  });

  it("detects managed URLs through shared helper", () => {
    mockIsUrlFromStorageEndpoint.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(isManagedStorageUrl("https://storage.example.com/a")).toBe(true);
    expect(isManagedStorageUrl("https://other.example.com/a")).toBe(false);
  });

  it("returns non-managed URLs unchanged", async () => {
    mockIsUrlFromStorageEndpoint.mockReturnValue(false);

    await expect(getSignedDownloadUrl("https://other.example.com/file.jpg")).resolves.toBe(
      "https://other.example.com/file.jpg"
    );
    expect(mockGetSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("generates and caches signed download URLs for managed URLs", async () => {
    mockGetSignedDownloadUrl.mockResolvedValue({
      success: true,
      url: "https://signed.example.com/file.jpg?sig=abc"
    });

    const first = await getSignedDownloadUrl(
      "https://storage.example.com/bucket/folder/file.jpg",
      900
    );
    const second = await getSignedDownloadUrl(
      "https://storage.example.com/bucket/folder/file.jpg",
      900
    );

    expect(first).toBe("https://signed.example.com/file.jpg?sig=abc");
    expect(second).toBe("https://signed.example.com/file.jpg?sig=abc");
    expect(mockGetSignedDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it("expires cache entries based on ttl safety window", async () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1_000);
    mockGetSignedDownloadUrl.mockResolvedValueOnce({
      success: true,
      url: "https://signed.example.com/file.jpg?sig=first"
    });

    const first = await getSignedDownloadUrl(
      "https://storage.example.com/bucket/expiring/file.jpg",
      61
    );
    expect(first).toBe("https://signed.example.com/file.jpg?sig=first");

    // effective ttl is 45s, so this should force cache expiration.
    nowSpy.mockReturnValueOnce(50_000);
    mockGetSignedDownloadUrl.mockResolvedValueOnce({
      success: true,
      url: "https://signed.example.com/file.jpg?sig=second"
    });
    const second = await getSignedDownloadUrl(
      "https://storage.example.com/bucket/expiring/file.jpg",
      61
    );

    expect(second).toBe("https://signed.example.com/file.jpg?sig=second");
    expect(mockGetSignedDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it("throws when URL is missing", async () => {
    await expect(getSignedDownloadUrl("")).rejects.toThrow(
      "URL is required to ensure public access"
    );
  });

  it("throws when storage service cannot sign URL", async () => {
    mockGetSignedDownloadUrl.mockResolvedValue({
      success: false,
      error: "failed to sign"
    });

    await expect(
      getSignedDownloadUrl("https://storage.example.com/bucket/folder/file.jpg")
    ).rejects.toThrow("failed to sign");
  });

  it("handles cache key extraction failures without caching", async () => {
    mockExtractStorageKeyFromUrl.mockImplementation(() => {
      throw new Error("extract failed");
    });
    mockGetSignedDownloadUrl.mockResolvedValue({
      success: true,
      url: "https://signed.example.com/no-cache.jpg"
    });

    await getSignedDownloadUrl("https://storage.example.com/bucket/folder/file.jpg");
    await getSignedDownloadUrl("https://storage.example.com/bucket/folder/file.jpg");

    expect(mockGetSignedDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it("uses fallback error message when signer returns no explicit error", async () => {
    mockGetSignedDownloadUrl.mockResolvedValue({
      success: false
    });

    await expect(
      getSignedDownloadUrl("https://storage.example.com/bucket/no-message.jpg")
    ).rejects.toThrow("Failed to generate signed download URL");
  });

  it("safe helpers fall back gracefully", async () => {
    mockGetSignedDownloadUrl.mockResolvedValue({
      success: false,
      error: "failed to sign"
    });

    await expect(
      getSignedDownloadUrlSafe("https://storage.example.com/bucket/folder/file.jpg")
    ).resolves.toBe("https://storage.example.com/bucket/folder/file.jpg");
    await expect(getSignedDownloadUrlSafe(null)).resolves.toBeUndefined();
    await expect(resolveSignedDownloadUrl(undefined)).resolves.toBeNull();
  });

  it("batch signs URL arrays", async () => {
    mockGetSignedDownloadUrl
      .mockResolvedValueOnce({ success: true, url: "https://signed/1" })
      .mockResolvedValueOnce({ success: true, url: "https://signed/2" });

    await expect(
      getSignedDownloadUrls([
        "https://storage.example.com/bucket/a.jpg",
        "https://storage.example.com/bucket/b.jpg"
      ])
    ).resolves.toEqual(["https://signed/1", "https://signed/2"]);
  });
});
