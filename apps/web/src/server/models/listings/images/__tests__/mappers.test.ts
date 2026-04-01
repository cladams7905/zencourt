import { mapListingImageToDisplayItem } from "../mappers";
import type { DBListingImage } from "@db/types/models";

function makeImage(overrides: Partial<DBListingImage> = {}): DBListingImage {
  return {
    id: "img-1",
    listingId: "listing-1",
    url: "https://example.com/image.jpg",
    filename: "image.jpg",
    category: "living-room",
    recommendationScore: 0.95,
    shotType: "room",
    analysisStatus: "complete",
    analysisRunId: null,
    analysisStartedAt: null,
    analysisCompletedAt: null,
    uploadedAt: new Date("2024-01-15T12:00:00Z"),
    metadata: null,
    ...overrides
  } as unknown as DBListingImage;
}

describe("mapListingImageToDisplayItem", () => {
  it("maps all fields correctly for a complete record", () => {
    const image = makeImage();
    const result = mapListingImageToDisplayItem(image);

    expect(result).toEqual({
      id: "img-1",
      url: "https://example.com/image.jpg",
      filename: "image.jpg",
      category: "living-room",
      recommendationScore: 0.95,
      shotType: "room",
      analysisStatus: "complete",
      metadata: null,
      uploadedAtMs: new Date("2024-01-15T12:00:00Z").getTime()
    });
  });

  it("coerces null category to null", () => {
    const result = mapListingImageToDisplayItem(makeImage({ category: null }));
    expect(result.category).toBeNull();
  });

  it("passes through shotType", () => {
    const result = mapListingImageToDisplayItem(makeImage({ shotType: "detail" }));
    expect(result.shotType).toBe("detail");
  });

  it("coerces null recommendationScore to null", () => {
    const result = mapListingImageToDisplayItem(
      makeImage({ recommendationScore: null })
    );
    expect(result.recommendationScore).toBeNull();
  });

  it("coerces non-number recommendationScore to null", () => {
    const result = mapListingImageToDisplayItem(
      makeImage({ recommendationScore: undefined as unknown as number })
    );
    expect(result.recommendationScore).toBeNull();
  });

  it("sets uploadedAtMs to image.uploadedAt.getTime()", () => {
    const date = new Date("2025-06-01T08:30:00Z");
    const result = mapListingImageToDisplayItem(makeImage({ uploadedAt: date }));
    expect(result.uploadedAtMs).toBe(date.getTime());
  });
});
