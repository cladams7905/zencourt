/** @jest-environment node */

const mockGetVideoGenJobById = jest.fn();
const mockUpdateVideoGenJob = jest.fn();
const mockGetClipVersionBySourceVideoGenJobId = jest.fn();
const mockUpdateClipVersion = jest.fn();
const mockMarkClipVersionAsCurrent = jest.fn();

jest.mock("@web/src/server/models/videoGen", () => ({
  getVideoGenJobById: (...args: unknown[]) =>
    (mockGetVideoGenJobById as (...a: unknown[]) => unknown)(...args),
  updateVideoGenJob: (...args: unknown[]) =>
    (mockUpdateVideoGenJob as (...a: unknown[]) => unknown)(...args),
  getClipVersionBySourceVideoGenJobId: (...args: unknown[]) =>
    (mockGetClipVersionBySourceVideoGenJobId as (...a: unknown[]) => unknown)(
      ...args
    ),
  updateClipVersion: (...args: unknown[]) =>
    (mockUpdateClipVersion as (...a: unknown[]) => unknown)(...args),
  markClipVersionAsCurrent: (...args: unknown[]) =>
    (mockMarkClipVersionAsCurrent as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn()
}));

import {
  normalizeWebhookResult,
  processVideoWebhookPayload
} from "@web/src/server/actions/video/webhook/commands";
import type { VideoWebhookPayload } from "@web/src/server/actions/video/webhook/types";

function minimalPayload(overrides: Partial<VideoWebhookPayload> = {}): VideoWebhookPayload {
  return {
    jobId: "job-1",
    listingId: "listing-1",
    status: "completed",
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe("video webhook commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClipVersionBySourceVideoGenJobId.mockResolvedValue(null);
    mockUpdateClipVersion.mockResolvedValue(undefined);
    mockMarkClipVersionAsCurrent.mockResolvedValue(undefined);
  });

  describe("normalizeWebhookResult", () => {
    it("extracts videoUrl, thumbnailUrl, errorMessage from payload", () => {
      const payload = minimalPayload({
        result: {
          videoUrl: "https://video.url",
          thumbnailUrl: "https://thumb.url",
          duration: 10
        }
      });
      expect(normalizeWebhookResult(payload)).toEqual({
        videoUrl: "https://video.url",
        thumbnailUrl: "https://thumb.url",
        errorMessage: null,
        metadata: undefined
      });
    });

    it("uses payload.error.message when present", () => {
      const payload = minimalPayload({
        result: undefined,
        error: { message: "Render failed" }
      });
      expect(normalizeWebhookResult(payload)).toMatchObject({
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: "Render failed"
      });
    });

    it("merges duration and fileSize into metadata when result has metadata", () => {
      const payload = minimalPayload({
        result: {
          videoUrl: "https://v",
          duration: 5,
          fileSize: 1024,
          metadata: { key: "value" }
        }
      });
      const out = normalizeWebhookResult(payload);
      expect(out.metadata).toEqual({
        key: "value",
        duration: 5,
        fileSize: 1024
      });
    });

    it("returns null for missing result fields", () => {
      const payload = minimalPayload({ result: undefined, error: undefined });
      expect(normalizeWebhookResult(payload)).toEqual({
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: null,
        metadata: undefined
      });
    });
  });

  describe("processVideoWebhookPayload", () => {
    it("returns not_found when job does not exist", async () => {
      mockGetVideoGenJobById.mockResolvedValue(null);

      const result = await processVideoWebhookPayload(minimalPayload());

      expect(result).toEqual({ status: "not_found" });
      expect(mockUpdateVideoGenJob).not.toHaveBeenCalled();
    });

    it("returns ok and updates job when job exists and update succeeds", async () => {
      const currentJob = {
        id: "job-1",
        status: "pending",
        listingId: "listing-1",
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: null
      };
      const updatedJob = { ...currentJob, status: "completed", videoUrl: "https://v" };
      mockGetVideoGenJobById
        .mockResolvedValueOnce(currentJob)
        .mockResolvedValueOnce(updatedJob);
      mockUpdateVideoGenJob.mockResolvedValue(undefined);

      const result = await processVideoWebhookPayload(
        minimalPayload({
          status: "completed",
          result: { videoUrl: "https://v", duration: 0 }
        })
      );

      expect(result).toEqual({ status: "ok" });
      expect(mockUpdateVideoGenJob).toHaveBeenCalledWith("job-1", {
        status: "completed",
        videoUrl: "https://v",
        thumbnailUrl: null,
        errorMessage: null,
        metadata: undefined
      });
    });

    it("updates matching clip version and promotes it on success", async () => {
      const currentJob = {
        id: "job-1",
        status: "pending",
        listingId: "listing-1",
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: null
      };
      const clipVersion = {
        id: "clip-version-2",
        clipId: "clip-1",
        listingId: "listing-1"
      };
      mockGetVideoGenJobById
        .mockResolvedValueOnce(currentJob)
        .mockResolvedValueOnce({ ...currentJob, status: "completed" });
      mockGetClipVersionBySourceVideoGenJobId.mockResolvedValueOnce(clipVersion);

      await processVideoWebhookPayload(
        minimalPayload({
          status: "completed",
          result: {
            videoUrl: "https://v",
            thumbnailUrl: "https://t",
            duration: 5
          }
        })
      );

      expect(mockUpdateClipVersion).toHaveBeenCalledWith("clip-version-2", {
        status: "completed",
        videoUrl: "https://v",
        thumbnailUrl: "https://t",
        errorMessage: null,
        durationSeconds: 5,
        metadata: undefined
      });
      expect(mockMarkClipVersionAsCurrent).toHaveBeenCalledWith({
        clipVersionId: "clip-version-2",
        listingId: "listing-1",
        clipId: "clip-1"
      });
    });

    it("updates matching clip version without promoting it on failure", async () => {
      const currentJob = {
        id: "job-1",
        status: "pending",
        listingId: "listing-1",
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: null
      };
      mockGetVideoGenJobById
        .mockResolvedValueOnce(currentJob)
        .mockResolvedValueOnce({ ...currentJob, status: "failed" });
      mockGetClipVersionBySourceVideoGenJobId.mockResolvedValueOnce({
        id: "clip-version-2",
        clipId: "clip-1",
        listingId: "listing-1"
      });

      await processVideoWebhookPayload(
        minimalPayload({
          status: "failed",
          error: { message: "provider failed" }
        })
      );

      expect(mockUpdateClipVersion).toHaveBeenCalledWith("clip-version-2", {
        status: "failed",
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: "provider failed",
        durationSeconds: null,
        metadata: undefined
      });
      expect(mockMarkClipVersionAsCurrent).not.toHaveBeenCalled();
    });

    it("returns update_failed when update throws", async () => {
      const currentJob = {
        id: "job-1",
        status: "pending",
        listingId: "listing-1",
        videoUrl: null,
        thumbnailUrl: null,
        errorMessage: null
      };
      mockGetVideoGenJobById.mockResolvedValue(currentJob);
      mockUpdateVideoGenJob.mockRejectedValue(new Error("DB error"));

      const result = await processVideoWebhookPayload(
        minimalPayload({ status: "completed", result: { videoUrl: "https://v", duration: 0 } })
      );

      expect(result).toEqual({ status: "update_failed" });
    });

    it("returns ok without updating when idempotent replay (same status and urls)", async () => {
      const currentJob = {
        id: "job-1",
        status: "completed",
        listingId: "listing-1",
        videoUrl: "https://same",
        thumbnailUrl: "https://thumb",
        errorMessage: null
      };
      mockGetVideoGenJobById.mockResolvedValue(currentJob);

      const result = await processVideoWebhookPayload(
        minimalPayload({
          status: "completed",
          result: {
            videoUrl: "https://same",
            thumbnailUrl: "https://thumb",
            duration: 0
          }
        })
      );

      expect(result).toEqual({ status: "ok" });
      expect(mockUpdateVideoGenJob).not.toHaveBeenCalled();
    });

    it("returns ok without updating when conflicting terminal status", async () => {
      const currentJob = {
        id: "job-1",
        status: "completed",
        listingId: "listing-1",
        videoUrl: "https://done",
        thumbnailUrl: null,
        errorMessage: null
      };
      mockGetVideoGenJobById.mockResolvedValue(currentJob);

      const result = await processVideoWebhookPayload(
        minimalPayload({
          status: "failed",
          error: { message: "Failed" }
        })
      );

      expect(result).toEqual({ status: "ok" });
      expect(mockUpdateVideoGenJob).not.toHaveBeenCalled();
    });
  });
});
