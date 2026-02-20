import {
  listingStageEnum,
  mediaTypeEnum,
  targetAudienceEnum,
  videoStatusEnum
} from "../drizzle/schema/enums";
import {
  content,
  listingImages,
  listings,
  userAdditional,
  userMedia,
  videoGenBatch,
  videoGenJobs
} from "../drizzle/schema";

describe("db schema contracts", () => {
  it("exposes stable enum values used across workspaces", () => {
    expect(videoStatusEnum.enumValues).toEqual([
      "pending",
      "processing",
      "completed",
      "failed",
      "canceled"
    ]);
    expect(listingStageEnum.enumValues).toEqual([
      "categorize",
      "review",
      "generate",
      "create"
    ]);
    expect(mediaTypeEnum.enumValues).toEqual(["video", "image"]);
    expect(targetAudienceEnum.enumValues).toContain("first_time_homebuyers");
  });

  it("exports core table objects", () => {
    expect(listings).toBeDefined();
    expect(content).toBeDefined();
    expect(listingImages).toBeDefined();
    expect(videoGenBatch).toBeDefined();
    expect(videoGenJobs).toBeDefined();
    expect(userAdditional).toBeDefined();
    expect(userMedia).toBeDefined();
  });
});
