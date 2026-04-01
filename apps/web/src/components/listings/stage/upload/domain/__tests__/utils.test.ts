import {
  buildListingUploadRecordInput,
  buildProcessingRoute,
  getListingImageRecommendationIssues,
  validateImageFile,
  validateListingUploadRequirements
} from "@web/src/components/listings/stage/upload/domain/utils";

describe("uploadUtils", () => {
  it("validates image uploads only", () => {
    const image = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const text = new File(["a"], "a.txt", { type: "text/plain" });

    expect(validateImageFile(image)).toEqual({ accepted: true });
    expect(validateImageFile(text)).toEqual({
      accepted: false,
      error: "Only image files are supported."
    });
  });

  it("rejects files over max size with explicit reason", async () => {
    const oversized = new File(["a"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(oversized, "size", { value: 6 * 1024 * 1024 });

    await expect(
      validateListingUploadRequirements({
        file: oversized,
        maxImageBytes: 5 * 1024 * 1024
      })
    ).resolves.toEqual({
      accepted: false,
      error: "\"big.jpg\" exceeds the 5.0 MB limit."
    });
  });

  it("returns no recommendation issues for sufficiently large landscape images", () => {
    expect(getListingImageRecommendationIssues(1920, 1080)).toEqual([]);
  });

  it("flags images below recommended pixel dimensions", () => {
    const issues = getListingImageRecommendationIssues(800, 600);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("800×600");
    expect(issues[0]).toContain("1280×720");
  });

  it("flags non-landscape orientation in recommendation issues", () => {
    const issues = getListingImageRecommendationIssues(720, 1280);
    expect(issues.some((line) => line.includes("landscape"))).toBe(true);
  });

  it("rejects portrait images", async () => {
    const originalImage = global.Image;
    const imageMock = class {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 720;
      naturalHeight = 1280;
      set src(_value: string) {
        this.onload?.();
      }
    };
    // @ts-expect-error test shim for image loading
    global.Image = imageMock;

    const portrait = new File(["a"], "portrait.jpg", { type: "image/jpeg" });
    await expect(
      validateListingUploadRequirements({
        file: portrait,
        maxImageBytes: 5 * 1024 * 1024
      })
    ).resolves.toEqual({
      accepted: false,
      error: "\"portrait.jpg\" must be landscape orientation."
    });

    global.Image = originalImage;
  });

  it("builds processing route with batch parameters", () => {
    expect(buildProcessingRoute("listing-1", 3, 100)).toBe(
      "/listings/listing-1/stage/categorize/processing?batch=3&batchStartedAt=100"
    );

    expect(buildProcessingRoute("listing-1", 0, 100)).toBe(
      "/listings/listing-1/stage/categorize/processing?batchStartedAt=100"
    );
  });

  it("throws when upload descriptor is missing required metadata", () => {
    expect(() =>
      buildListingUploadRecordInput({ key: "k1", fileName: "x.jpg" })
    ).toThrow("Listing upload is missing metadata.");
  });
});
