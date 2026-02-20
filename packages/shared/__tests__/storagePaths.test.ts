import {
  getFinalVideoPath,
  getListingImagePath,
  getUserMediaPath,
  sanitizeFilename
} from "../utils/storagePaths";

describe("storagePaths", () => {
  const realDateNow = Date.now;

  beforeEach(() => {
    Date.now = jest.fn(() => 1700000000000);
  });

  afterEach(() => {
    Date.now = realDateNow;
  });

  it("sanitizes filenames for storage-safe values", () => {
    expect(sanitizeFilename("Living Room (Final).JPG")).toBe(
      "living_room_final_.jpg"
    );
  });

  it("builds listing image path", () => {
    expect(getListingImagePath("user-1", "listing-1", "My File.png")).toBe(
      "user_user-1/listings/listing_listing-1/images/my_file.png"
    );
  });

  it("builds final video path with listing name", () => {
    expect(
      getFinalVideoPath("user-1", "listing-1", "video-1", "123 Main St")
    ).toBe(
      "user_user-1/listings/listing_listing-1/videos/video_video-1/final_123_main_st_1700000000000.mp4"
    );
  });

  it("builds user media path with generated unique name", () => {
    const path = getUserMediaPath("user-1", "image", "Kitchen Shot.jpg");

    expect(path).toBe(
      "user_user-1/media/images/kitchen_shot-1700000000000-shared.jpg"
    );
  });
});
