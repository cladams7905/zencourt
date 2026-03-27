import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import {
  applyOptimisticClipRegenerations,
  buildCompletedFallbackItem,
  buildPendingBatchState,
  hasActiveClipRegenerationPoll,
  resetListingClipRegenerationStoreForTests,
  setOptimisticClipRegeneration
} from "../regenerationState";

describe("listingClipRegenerationState", () => {
  const listingId = "listing-1";
  const baseItem: ListingClipVersionItem = {
    clipId: "clip-1",
    roomName: "Kitchen",
    roomId: "room-1",
    clipIndex: 0,
    sortOrder: 0,
    currentVersion: {
      id: "clip-1",
      clipVersionId: "clip-version-1",
      roomName: "Kitchen",
      thumbnail: "https://thumb",
      videoUrl: "https://video",
      aiDirections: "Warm light",
      durationSeconds: 4,
      versionNumber: 1,
      versionStatus: "completed",
      generatedAt: "2026-03-19T12:30:00.000Z"
    },
    versions: [
      {
        id: "clip-1",
        clipVersionId: "clip-version-1",
        roomName: "Kitchen",
        thumbnail: "https://thumb",
        videoUrl: "https://video",
        aiDirections: "Warm light",
        durationSeconds: 4,
        versionNumber: 1,
        versionStatus: "completed",
        generatedAt: "2026-03-19T12:30:00.000Z"
      }
    ]
  };

  beforeEach(() => {
    resetListingClipRegenerationStoreForTests();
  });

  it("reapplies optimistic in-flight regeneration when polled data is still stale", () => {
    setOptimisticClipRegeneration(listingId, "clip-1", {
      fallbackItem: baseItem,
      inFlightVersion: {
        ...baseItem.currentVersion,
        clipVersionId: "clip-version-2",
        versionStatus: "processing",
        generatedAt: "2026-03-20T12:30:00.000Z"
      },
      batchId: "batch-1"
    });

    const result = applyOptimisticClipRegenerations(listingId, [baseItem]);

    expect(result[0]?.currentVersion.clipVersionId).toBe("clip-version-1");
    expect(result[0]?.inFlightVersion?.clipVersionId).toBe("clip-version-2");
    expect(result[0]?.inFlightVersion?.versionStatus).toBe("processing");
  });

  it("restores the last completed version when canceling after currentVersion has already flipped to processing", () => {
    const processingItem: ListingClipVersionItem = {
      ...baseItem,
      currentVersion: {
        ...baseItem.currentVersion,
        clipVersionId: "clip-version-2",
        versionStatus: "processing",
        generatedAt: "2026-03-20T12:30:00.000Z"
      }
    };

    const fallback = buildCompletedFallbackItem(processingItem);

    expect(fallback.currentVersion.clipVersionId).toBe("clip-version-1");
    expect(fallback.currentVersion.versionStatus).toBe("completed");
    expect(fallback.inFlightVersion).toBeNull();
  });

  it("stops polling when the only processing clip is locally canceled", () => {
    const processingItem: ListingClipVersionItem = {
      ...baseItem,
      currentVersion: {
        ...baseItem.currentVersion,
        clipVersionId: "clip-version-2",
        versionStatus: "processing"
      }
    };

    expect(
      hasActiveClipRegenerationPoll({
        items: [processingItem],
        canceledClipIds: new Set(["clip-1"]),
        pendingBatchIdByClipId: {}
      })
    ).toBe(false);
  });

  it("builds pending batch state from optimistic regenerations", () => {
    setOptimisticClipRegeneration(listingId, "clip-1", {
      fallbackItem: baseItem,
      inFlightVersion: {
        ...baseItem.currentVersion,
        clipVersionId: "clip-version-2",
        versionStatus: "processing"
      },
      batchId: "batch-1"
    });

    expect(buildPendingBatchState(listingId)).toEqual({
      "clip-1": "batch-1"
    });
  });
});
