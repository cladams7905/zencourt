import { mapListingImageToDisplayItem } from "../mappers";
import type { DBListingImage } from "@shared/types/models";

function makeImage(overrides: Partial<DBListingImage> = {}): DBListingImage {
  return {
    id: "img-1",
    listingId: "listing-1",
    userId: "user-1",
    url: "https://example.com/image.jpg",
    filename: "image.jpg",
    category: "living_room",
    isPrimary: true,
    primaryScore: 0.95,
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
      category: "living_room",
      isPrimary: true,
      primaryScore: 0.95,
      uploadedAtMs: new Date("2024-01-15T12:00:00Z").getTime()
    });
  });

  it("coerces null category to null", () => {
    const result = mapListingImageToDisplayItem(makeImage({ category: null }));
    expect(result.category).toBeNull();
  });

  it("coerces null isPrimary to false", () => {
    const result = mapListingImageToDisplayItem(makeImage({ isPrimary: null as unknown as boolean }));
    expect(result.isPrimary).toBe(false);
  });

  it("coerces null primaryScore to null", () => {
    const result = mapListingImageToDisplayItem(makeImage({ primaryScore: null }));
    expect(result.primaryScore).toBeNull();
  });

  it("coerces non-number primaryScore to null", () => {
    const result = mapListingImageToDisplayItem(makeImage({ primaryScore: undefined as unknown as number }));
    expect(result.primaryScore).toBeNull();
  });

  it("sets uploadedAtMs to image.uploadedAt.getTime()", () => {
    const date = new Date("2025-06-01T08:30:00Z");
    const result = mapListingImageToDisplayItem(makeImage({ uploadedAt: date }));
    expect(result.uploadedAtMs).toBe(date.getTime());
  });
});
