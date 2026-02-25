const mockRunListingImagesCategorizationWorkflow = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/actions/imageCategorization/helpers", () => ({
  runListingImagesCategorizationWorkflow: (...args: unknown[]) =>
    (
      mockRunListingImagesCategorizationWorkflow as (...a: unknown[]) => unknown
    )(...args)
}));

jest.mock("@web/src/server/auth/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  categorizeListingImages,
  categorizeListingImagesByIds
} from "@web/src/server/actions/imageCategorization/commands";

describe("imageCategorization categorize action", () => {
  beforeEach(() => {
    mockRunListingImagesCategorizationWorkflow.mockReset();
    mockRequireAuthenticatedUser.mockReset();
  });

  it("propagates validation errors from workflow", async () => {
    mockRunListingImagesCategorizationWorkflow.mockRejectedValueOnce(
      new Error("User ID is required to fetch a listing")
    );
    await expect(categorizeListingImages("", "l1")).rejects.toThrow(
      "User ID is required to fetch a listing"
    );

    mockRunListingImagesCategorizationWorkflow.mockRejectedValueOnce(
      new Error("Listing ID is required to fetch a listing")
    );
    await expect(categorizeListingImages("u1", "")).rejects.toThrow(
      "Listing ID is required to fetch a listing"
    );
  });

  it("returns noop stats when workflow returns noop", async () => {
    mockRunListingImagesCategorizationWorkflow.mockResolvedValueOnce({
      total: 0,
      uploaded: 1,
      analyzed: 1,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });

    const result = await categorizeListingImages("u1", "l1");

    expect(result).toEqual({
      total: 0,
      uploaded: 1,
      analyzed: 1,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });
    expect(mockRunListingImagesCategorizationWorkflow).toHaveBeenCalledWith(
      "u1",
      "l1",
      { aiConcurrency: undefined }
    );
  });

  it("returns noop stats for empty imageIds input", async () => {
    const result = await categorizeListingImagesByIds("u1", "l1", []);

    expect(result).toEqual({
      total: 0,
      uploaded: 0,
      analyzed: 0,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });
    expect(mockRunListingImagesCategorizationWorkflow).not.toHaveBeenCalled();
  });

  it("calls workflow with options and imageIds when provided", async () => {
    mockRunListingImagesCategorizationWorkflow.mockResolvedValueOnce({
      total: 2,
      uploaded: 2,
      analyzed: 2,
      failed: 0,
      successRate: 100,
      avgConfidence: 0.8,
      totalDuration: 10
    });

    const result = await categorizeListingImagesByIds(
      "u1",
      "l1",
      ["img-1", "img-2"],
      { aiConcurrency: 2 }
    );

    expect(result).toEqual(
      expect.objectContaining({ total: 2, analyzed: 2, failed: 0 })
    );
    expect(mockRunListingImagesCategorizationWorkflow).toHaveBeenCalledWith(
      "u1",
      "l1",
      { aiConcurrency: 2 },
      ["img-1", "img-2"]
    );
  });

  it("delegates to workflow and returns stats", async () => {
    mockRunListingImagesCategorizationWorkflow.mockResolvedValueOnce({
      total: 2,
      uploaded: 2,
      analyzed: 2,
      failed: 0,
      successRate: 100,
      avgConfidence: 0.8,
      totalDuration: 10
    });

    const result = await categorizeListingImages("u1", "l1", {
      aiConcurrency: 2
    });

    expect(result).toEqual(
      expect.objectContaining({ total: 2, analyzed: 2, failed: 0 })
    );
    expect(mockRunListingImagesCategorizationWorkflow).toHaveBeenCalledWith(
      "u1",
      "l1",
      { aiConcurrency: 2 }
    );
  });
});
