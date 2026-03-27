/** @jest-environment node */
const mockDeleteCachedListingContentItemService = jest.fn();
const mockUpdateCachedListingContentTextService = jest.fn();
const mockUpdateCachedListingContentTimelineService = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  deleteCachedListingContentItem: (...args: unknown[]) =>
    (mockDeleteCachedListingContentItemService as (...a: unknown[]) => unknown)(
      ...args
    ),
  updateCachedListingContentText: (...args: unknown[]) =>
    (mockUpdateCachedListingContentTextService as (...a: unknown[]) => unknown)(
      ...args
    ),
  updateCachedListingContentTimeline: (...args: unknown[]) =>
    (mockUpdateCachedListingContentTimelineService as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
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

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: jest.fn()
  })
}));

import { DomainValidationError } from "@web/src/server/errors/domain";
import {
  deleteCachedListingContentItem,
  updateCachedListingVideoText,
  updateCachedListingVideoTimeline
} from "@web/src/server/actions/listings/content/cache";

describe("listings content cache actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue({ id: "listing-1" });
  });

  it("validates cache identity + subcategory for delete action", async () => {
    await expect(
      deleteCachedListingContentItem("listing-1", {
        cacheKeyTimestamp: 0,
        cacheKeyId: 1,
        subcategory: "new_listing"
      })
    ).rejects.toThrow(DomainValidationError);

    await deleteCachedListingContentItem("listing-1", {
      cacheKeyTimestamp: 123,
      cacheKeyId: 0,
      subcategory: "new_listing"
    });

    expect(mockDeleteCachedListingContentItemService).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "image",
      timestamp: 123,
      id: 0
    });
  });

  it("updates cached video text with normalized payload", async () => {
    mockUpdateCachedListingContentTextService.mockResolvedValueOnce({
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 }
    });

    const result = await updateCachedListingVideoText("listing-1", {
      cacheKeyTimestamp: 123,
      cacheKeyId: 456,
      subcategory: "new_listing",
      hook: " Updated hook ",
      caption: " Updated caption ",
      orderedClipIds: [" clip-2 ", "clip-1"],
      clipDurationOverrides: { "clip-2": 4.251, "clip-1": 3.749 }
    });

    expect(mockUpdateCachedListingContentTextService).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video",
      timestamp: 123,
      id: 456,
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 }
    });
    expect(result).toEqual({
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 }
    });
  });

  it("updates cached video timeline and rejects missing sequence", async () => {
    await expect(
      updateCachedListingVideoTimeline("listing-1", {
        cacheKeyTimestamp: 123,
        cacheKeyId: 456,
        subcategory: "new_listing",
        orderedClipIds: []
      })
    ).rejects.toThrow(DomainValidationError);

    mockUpdateCachedListingContentTimelineService.mockResolvedValueOnce({
      orderedClipIds: ["clip-a"],
      clipDurationOverrides: { "clip-a": 2.5 }
    });

    const result = await updateCachedListingVideoTimeline("listing-1", {
      cacheKeyTimestamp: 123,
      cacheKeyId: 456,
      subcategory: "new_listing",
      orderedClipIds: ["clip-a"],
      clipDurationOverrides: { "clip-a": 2.5 }
    });

    expect(result).toEqual({
      orderedClipIds: ["clip-a"],
      clipDurationOverrides: { "clip-a": 2.5 }
    });
  });
});
