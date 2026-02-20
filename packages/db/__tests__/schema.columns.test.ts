import { getTableColumns } from "drizzle-orm";
import {
  content,
  listingImages,
  listings,
  userAdditional,
  userMedia,
  videoGenBatch,
  videoGenJobs
} from "../drizzle/schema";

function columnKeys(table: Parameters<typeof getTableColumns>[0]): string[] {
  return Object.keys(getTableColumns(table)).sort();
}

describe("db schema column contracts", () => {
  it("keeps expected listings columns", () => {
    expect(columnKeys(listings)).toEqual(
      [
        "address",
        "createdAt",
        "id",
        "lastOpenedAt",
        "listingStage",
        "propertyDetails",
        "propertyDetailsFetchedAt",
        "propertyDetailsRevision",
        "propertyDetailsSource",
        "title",
        "updatedAt",
        "userId"
      ].sort()
    );
  });

  it("keeps expected content columns", () => {
    expect(columnKeys(content)).toEqual(
      [
        "contentType",
        "contentUrl",
        "createdAt",
        "id",
        "isFavorite",
        "listingId",
        "metadata",
        "status",
        "thumbnailUrl",
        "updatedAt",
        "userId"
      ].sort()
    );
  });

  it("keeps expected listing image columns", () => {
    expect(columnKeys(listingImages)).toEqual(
      [
        "category",
        "confidence",
        "filename",
        "id",
        "isPrimary",
        "listingId",
        "metadata",
        "primaryScore",
        "uploadedAt",
        "url"
      ].sort()
    );
  });

  it("keeps expected user additional columns", () => {
    expect(columnKeys(userAdditional)).toEqual(
      [
        "accountType",
        "agentBio",
        "agentName",
        "agentTitle",
        "audienceDescription",
        "brokerageName",
        "county",
        "createdAt",
        "headshotUrl",
        "location",
        "mediaUploadedAt",
        "paymentPlan",
        "personalLogoUrl",
        "profileCompletedAt",
        "referralSource",
        "referralSourceOther",
        "serviceAreas",
        "surveyCompletedAt",
        "targetAudiences",
        "updatedAt",
        "userId",
        "weeklyGenerationLimit",
        "weeklyPostingFrequency",
        "writingStyleCompletedAt",
        "writingStyleCustom",
        "writingToneLevel"
      ].sort()
    );
  });

  it("keeps expected user media and video generation columns", () => {
    expect(columnKeys(userMedia)).toEqual(
      [
        "id",
        "thumbnailUrl",
        "type",
        "uploadedAt",
        "url",
        "usageCount",
        "userId"
      ].sort()
    );
    expect(columnKeys(videoGenBatch)).toEqual(
      [
        "createdAt",
        "errorMessage",
        "id",
        "listingId",
        "status",
        "updatedAt"
      ].sort()
    );
    expect(columnKeys(videoGenJobs)).toEqual(
      [
        "createdAt",
        "errorMessage",
        "generationSettings",
        "id",
        "metadata",
        "requestId",
        "status",
        "thumbnailUrl",
        "updatedAt",
        "videoGenBatchId",
        "videoUrl"
      ].sort()
    );
  });
});
