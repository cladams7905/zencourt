import {
  buildListingUploadRecordInput,
  buildProcessingRoute,
  validateImageFile
} from "@web/src/components/listings/sync/domain/listingSyncUtils";

describe("listingSyncUtils", () => {
  it("validates image uploads only", () => {
    const image = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const text = new File(["a"], "a.txt", { type: "text/plain" });

    expect(validateImageFile(image)).toEqual({ accepted: true });
    expect(validateImageFile(text)).toEqual({
      accepted: false,
      error: "Only image files are supported."
    });
  });

  it("builds processing route with batch parameters", () => {
    expect(buildProcessingRoute("listing-1", 3, 100)).toBe(
      "/listings/listing-1/categorize/processing?batch=3&batchStartedAt=100"
    );

    expect(buildProcessingRoute("listing-1", 0, 100)).toBe(
      "/listings/listing-1/categorize/processing?batchStartedAt=100"
    );
  });

  it("throws when upload descriptor is missing required metadata", () => {
    expect(() =>
      buildListingUploadRecordInput({ key: "k1", fileName: "x.jpg" })
    ).toThrow("Listing upload is missing metadata.");
  });
});
