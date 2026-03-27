const mockGetVideoGenerationStatusService = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetPublicDownloadUrlSafe = jest.fn();
const mockGetVideoGenBatchById = jest.fn();

jest.mock("@web/src/server/services/videoGeneration", () => ({
  getVideoGenerationStatus: (...args: unknown[]) =>
    (mockGetVideoGenerationStatusService as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/video", () => ({
  getVideoGenBatchById: (...args: unknown[]) =>
    (mockGetVideoGenBatchById as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/storage/urlResolution", () => ({
  getPublicDownloadUrlSafe: (...args: unknown[]) =>
    (mockGetPublicDownloadUrlSafe as (...a: unknown[]) => unknown)(...args)
}));

import { getVideoGenerationStatus } from "@web/src/server/actions/video/generate/queries";

describe("video queries", () => {
  const mockUser = { id: "user-1" } as never;

  beforeEach(() => {
    mockGetVideoGenerationStatusService.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockReset();
    mockRequireListingAccess.mockResolvedValue(undefined);
    mockGetVideoGenBatchById.mockReset();
    mockGetVideoGenBatchById.mockResolvedValue({
      id: "batch-1",
      listingId: "listing-1"
    });
  });

  it("returns service result after checking access", async () => {
    const status = { batchId: "b1", status: "processing" };
    mockGetVideoGenerationStatusService.mockResolvedValueOnce(status);

    const result = await getVideoGenerationStatus("batch-1");

    expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
    expect(mockRequireListingAccess).toHaveBeenCalledWith(
      "listing-1",
      "user-1"
    );
    expect(mockGetVideoGenBatchById).toHaveBeenCalledWith("batch-1");
    expect(mockGetVideoGenerationStatusService).toHaveBeenCalledWith(
      "batch-1",
      expect.any(Function)
    );
    expect(result).toEqual(status);
  });
});
