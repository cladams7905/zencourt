import {
  fromDBImage,
  toInsertDBImage,
  toSerializable,
  type ProcessedImage
} from "@web/src/lib/domain/listing/images";

describe("listing images adapters", () => {
  it("maps processed image to serializable payload", () => {
    const processed: ProcessedImage = {
      id: "img-1",
      listingId: "listing-1",
      file: new File(["x"], "photo.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:preview",
      status: "uploaded",
      url: "https://cdn.example.com/photo.jpg",
      filename: "photo.jpg",
      category: "kitchen",
      confidence: 0.9,
      primaryScore: 0.7,
      isPrimary: true,
      metadata: {
        width: 1000,
        height: 750,
        format: "jpeg",
        size: 1024,
        lastModified: 1
      }
    };

    expect(toSerializable(processed)).toEqual(
      expect.objectContaining({
        id: "img-1",
        listingId: "listing-1",
        filename: "photo.jpg",
        status: "uploaded"
      })
    );
  });

  it("maps processed image to insert payload with safe fallbacks", () => {
    const processed: ProcessedImage = {
      id: "img-2",
      file: new File(["x"], "fallback-name.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:preview",
      status: "analyzed",
      url: "https://cdn.example.com/fallback.jpg"
    };

    expect(toInsertDBImage(processed, "listing-2")).toEqual({
      id: "img-2",
      listingId: "listing-2",
      filename: "fallback-name.jpg",
      url: "https://cdn.example.com/fallback.jpg",
      category: null,
      confidence: null,
      primaryScore: null,
      isPrimary: false,
      metadata: null
    });
  });

  it("maps db image to processed shape with synthesized file when omitted", () => {
    const dbImage = {
      id: "img-3",
      listingId: "listing-3",
      filename: "db.jpg",
      url: "https://cdn.example.com/db.jpg",
      category: null,
      confidence: null,
      primaryScore: null,
      isPrimary: false,
      metadata: null,
      uploadedAt: new Date("2026-02-01T00:00:00.000Z")
    };

    const mapped = fromDBImage(dbImage as never);
    expect(mapped.previewUrl).toBe("https://cdn.example.com/db.jpg");
    expect(mapped.status).toBe("analyzed");
    expect(mapped.file).toBeInstanceOf(File);
  });
});
