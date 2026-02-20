import {
  buildGenericUploadKey,
  buildUserListingVideoKey,
  generateTempListingId,
  getListingFolder,
  getListingImagePath,
  sanitizeFilename,
  sanitizePathSegment
} from "..";

describe("storagePaths generic/sanitize", () => {
  const realDateNow = Date.now;
  const realRandom = Math.random;

  beforeEach(() => {
    Date.now = jest.fn(() => 1700000000000);
    Math.random = jest.fn(() => 0.123456789);
  });

  afterEach(() => {
    Date.now = realDateNow;
    Math.random = realRandom;
  });

  it("builds canonical listing/video keys", () => {
    expect(getListingFolder("listing-1", "user-1")).toBe(
      "user_user-1/listings/listing_listing-1"
    );
    expect(getListingImagePath("user-1", "listing-1", "A.png")).toBe(
      "user_user-1/listings/listing_listing-1/images/a.png"
    );
    expect(buildUserListingVideoKey("user-1", "listing-1", "video.mp4", "v1")).toBe(
      "user_user-1/listings/listing_listing-1/videos/video_v1/video.mp4"
    );
  });

  it("builds deterministic generic keys and temp ids", () => {
    expect(buildGenericUploadKey("folder", "A File.png")).toBe(
      "folder/1700000000000-4fzzzxjy/A_File.png"
    );
    expect(generateTempListingId()).toBe("temp-1700000000000");
  });

  it("sanitizes path segments and filenames", () => {
    expect(sanitizePathSegment("abc /?:def")).toBe("abc____def");
    expect(sanitizeFilename("Living Room!!.JPG")).toBe("living_room_.jpg");
  });
});
