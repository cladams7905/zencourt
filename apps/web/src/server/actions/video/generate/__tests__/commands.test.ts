const mockStartListingVideoGenerationHelper = jest.fn();
const mockRegenerateListingClipVersionHelper = jest.fn();
const mockCancelVideoGenerationBatchHelper = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetPublicDownloadUrls = jest.fn();
const mockGetVideoGenBatchById = jest.fn();
const mockGetVideoClipById = jest.fn();
const mockGetVideoClipVersionById = jest.fn();
const mockUpdateVideoClip = jest.fn();

jest.mock("@web/src/server/actions/video/generate/helpers", () => ({
  startListingVideoGeneration: (...args: unknown[]) =>
    (mockStartListingVideoGenerationHelper as (...a: unknown[]) => unknown)(
      ...args
    ),
  regenerateListingClipVersion: (...args: unknown[]) =>
    (mockRegenerateListingClipVersionHelper as (...a: unknown[]) => unknown)(
      ...args
    ),
  cancelVideoGenerationBatch: (...args: unknown[]) =>
    (mockCancelVideoGenerationBatchHelper as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/actions/shared/auth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUserListingAccess: async (
    listingIdOrResolver: string | ((context: { user: { id: string } }) => string | Promise<string>),
    run: (context: { user: { id: string }; listing: unknown }) => unknown
  ) => {
    const user = await mockRequireAuthenticatedUser();
    const listingId =
      typeof listingIdOrResolver === "function"
        ? await listingIdOrResolver({ user })
        : listingIdOrResolver;
    const listing = await mockRequireListingAccess(listingId, user.id);
    return run({ user, listing });
  }
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/video", () => ({
  getVideoGenBatchById: (...args: unknown[]) =>
    (mockGetVideoGenBatchById as (...a: unknown[]) => unknown)(...args),
  getVideoClipById: (...args: unknown[]) =>
    (mockGetVideoClipById as (...a: unknown[]) => unknown)(...args),
  getVideoClipVersionById: (...args: unknown[]) =>
    (mockGetVideoClipVersionById as (...a: unknown[]) => unknown)(...args),
  updateVideoClip: (...args: unknown[]) =>
    (mockUpdateVideoClip as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/storage/urlResolution", () => ({
  getPublicDownloadUrls: (...args: unknown[]) =>
    (mockGetPublicDownloadUrls as (...a: unknown[]) => unknown)(...args)
}));

import {
  regenerateListingClipVersion,
  startListingVideoGeneration,
  cancelVideoGenerationBatch,
  selectListingClipVersion
} from "@web/src/server/actions/video/generate/commands";

describe("video commands", () => {
  const mockUser = { id: "user-1" } as never;
  const mockListing = { id: "listing-1" } as never;

  beforeEach(() => {
    mockStartListingVideoGenerationHelper.mockReset();
    mockRegenerateListingClipVersionHelper.mockReset();
    mockCancelVideoGenerationBatchHelper.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockReset();
    mockRequireListingAccess.mockResolvedValue(mockListing);
    mockGetVideoGenBatchById.mockReset();
    mockGetVideoGenBatchById.mockResolvedValue({
      id: "batch-1",
      listingId: "listing-1"
    });
    mockGetVideoClipById.mockReset();
    mockGetVideoClipById.mockResolvedValue({
      id: "clip-1",
      listingId: "listing-1"
    });
    mockGetVideoClipVersionById.mockReset();
    mockGetVideoClipVersionById.mockResolvedValue({
      id: "clip-version-2",
      videoClipId: "clip-1"
    });
    mockUpdateVideoClip.mockReset();
    mockUpdateVideoClip.mockResolvedValue(undefined);
  });

  describe("startListingVideoGeneration", () => {
    it("throws when body has no listingId", async () => {
      await expect(startListingVideoGeneration({})).rejects.toThrow(
        "listingId is required"
      );
      await expect(
        startListingVideoGeneration({ listingId: "" })
      ).rejects.toThrow("listingId is required");
      await expect(
        startListingVideoGeneration({ listingId: 123 })
      ).rejects.toThrow("listingId is required");
    });

    it("trims listingId and passes through to service", async () => {
      mockStartListingVideoGenerationHelper.mockResolvedValueOnce({
        batchId: "b1",
        jobCount: 1
      });

      const result = await startListingVideoGeneration({
        listingId: "  listing-1  "
      });

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockStartListingVideoGenerationHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        userId: "user-1",
        orientation: undefined,
        resolvePublicDownloadUrls: expect.any(Function)
      });
      expect(result).toEqual({
        batchId: "b1",
        jobCount: 1,
        listingId: "listing-1"
      });
    });

    it("passes orientation without custom prompt input", async () => {
      mockStartListingVideoGenerationHelper.mockResolvedValueOnce({
        batchId: "b1",
        jobCount: 0
      });

      await startListingVideoGeneration({
        listingId: "l1",
        orientation: "portrait"
      });

      expect(mockStartListingVideoGenerationHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        userId: "user-1",
        orientation: "portrait",
        resolvePublicDownloadUrls: expect.any(Function)
      });
    });
  });

  describe("cancelVideoGenerationBatch", () => {
    it("delegates to helper with optional reason", async () => {
      mockCancelVideoGenerationBatchHelper.mockResolvedValueOnce(undefined);

      await cancelVideoGenerationBatch("batch-1", "user cancelled");

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockGetVideoGenBatchById).toHaveBeenCalledWith("batch-1");
      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockCancelVideoGenerationBatchHelper).toHaveBeenCalledWith({
        batchId: "batch-1",
        reason: "user cancelled"
      });
    });

    it("calls helper without reason when not provided", async () => {
      mockCancelVideoGenerationBatchHelper.mockResolvedValueOnce(undefined);

      await cancelVideoGenerationBatch("batch-1");

      expect(mockCancelVideoGenerationBatchHelper).toHaveBeenCalledWith({
        batchId: "batch-1",
        reason: undefined
      });
    });
  });

  describe("regenerateListingClipVersion", () => {
    it("throws when body is missing required fields", async () => {
      await expect(regenerateListingClipVersion({})).rejects.toThrow(
        "listingId is required"
      );
      await expect(
        regenerateListingClipVersion({ listingId: "listing-1" })
      ).rejects.toThrow("clipId is required");
    });

    it("validates access and delegates clip regeneration", async () => {
      mockRegenerateListingClipVersionHelper.mockResolvedValueOnce({
        clipId: "clip-1",
        clipVersionId: "clip-version-2",
        batchId: "batch-2"
      });

      const result = await regenerateListingClipVersion({
        listingId: " listing-1 ",
        clipId: " clip-1 ",
        prompt: " Preserve window light "
      });

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockRegenerateListingClipVersionHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        userId: "user-1",
        clipId: "clip-1",
        prompt: " Preserve window light ",
        resolvePublicDownloadUrls: expect.any(Function)
      });
      expect(result).toEqual({
        clipId: "clip-1",
        clipVersionId: "clip-version-2",
        batchId: "batch-2",
        listingId: "listing-1"
      });
    });
  });

  describe("selectListingClipVersion", () => {
    it("throws when body is missing required fields", async () => {
      await expect(selectListingClipVersion({})).rejects.toThrow(
        "listingId is required"
      );
      await expect(
        selectListingClipVersion({ listingId: "listing-1" })
      ).rejects.toThrow("clipId is required");
      await expect(
        selectListingClipVersion({ listingId: "listing-1", clipId: "clip-1" })
      ).rejects.toThrow("clipVersionId is required");
    });

    it("persists the selected clip version as the current clip version", async () => {
      const result = await selectListingClipVersion({
        listingId: " listing-1 ",
        clipId: " clip-1 ",
        clipVersionId: " clip-version-2 "
      });

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockGetVideoClipById).toHaveBeenCalledWith("clip-1");
      expect(mockGetVideoClipVersionById).toHaveBeenCalledWith("clip-version-2");
      expect(mockUpdateVideoClip).toHaveBeenCalledWith("clip-1", {
        currentVideoClipVersionId: "clip-version-2"
      });
      expect(result).toEqual({
        listingId: "listing-1",
        clipId: "clip-1",
        clipVersionId: "clip-version-2"
      });
    });

    it("rejects a clip version that does not belong to the clip", async () => {
      mockGetVideoClipVersionById.mockResolvedValueOnce({
        id: "clip-version-2",
        videoClipId: "clip-99"
      });

      await expect(
        selectListingClipVersion({
          listingId: "listing-1",
          clipId: "clip-1",
          clipVersionId: "clip-version-2"
        })
      ).rejects.toThrow("clipVersionId is invalid");
    });
  });
});
