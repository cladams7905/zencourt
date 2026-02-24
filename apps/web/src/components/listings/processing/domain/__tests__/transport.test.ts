const mockUpdateListingForCurrentUser = jest.fn();
const mockFetchPropertyDetailsForCurrentUser = jest.fn();
const mockCategorizeListingImagesForCurrentUser = jest.fn();
const mockStartListingVideoGeneration = jest.fn();
const mockCancelListingVideoGeneration = jest.fn();

jest.mock("@web/src/server/actions/listings/commands", () => ({
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListingForCurrentUser(...args)
}));

jest.mock("@web/src/server/actions/propertyDetails/commands", () => ({
  fetchPropertyDetailsForCurrentUser: (...args: unknown[]) =>
    mockFetchPropertyDetailsForCurrentUser(...args)
}));

jest.mock("@web/src/server/actions/imageCategorization", () => ({
  categorizeListingImagesForCurrentUser: (...args: unknown[]) =>
    mockCategorizeListingImagesForCurrentUser(...args)
}));

jest.mock("@web/src/server/actions/video", () => ({
  startListingVideoGeneration: (...args: unknown[]) =>
    mockStartListingVideoGeneration(...args),
  cancelListingVideoGeneration: (...args: unknown[]) =>
    mockCancelListingVideoGeneration(...args)
}));

import {
  cancelVideoGeneration,
  fetchListingImages,
  fetchVideoStatus,
  startListingContentGeneration,
  startVideoGeneration,
  triggerCategorization,
  updateListingStage
} from "@web/src/components/listings/processing/domain/transport";

describe("processing transport", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("delegates action-backed operations", async () => {
    await updateListingStage("l1", "review");
    await triggerCategorization("l1");
    await startVideoGeneration("l1");
    await cancelVideoGeneration("l1");

    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith("l1", {
      listingStage: "review"
    });
    expect(mockCategorizeListingImagesForCurrentUser).toHaveBeenCalledWith("l1");
    expect(mockStartListingVideoGeneration).toHaveBeenCalledWith({ listingId: "l1" });
    expect(mockCancelListingVideoGeneration).toHaveBeenCalledWith(
      "l1",
      "Canceled by user"
    );
  });

  it("handles video status and listing image fetch responses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { jobs: [{ id: "j1" }] } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ category: null }] })
      });

    await expect(fetchVideoStatus("l1")).resolves.toEqual({
      jobs: [{ id: "j1" }]
    });
    await expect(fetchListingImages("l1")).resolves.toEqual([{ category: null }]);
  });

  it("throws generation error message from payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "boom" })
    });

    await expect(startListingContentGeneration("l1")).rejects.toThrow("boom");
  });
});
