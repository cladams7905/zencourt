import type { DBListingImage } from "@db/types/models";

jest.mock("@web/src/app/api/v1/_utils", () => {
  class MockApiError extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.status = status;
      this.body = body;
    }
  }

  return { ApiError: MockApiError };
});

import {
  buildRoomsFromImages,
  getCategoryForRoom,
  groupImagesByCategory,
  selectListingPrimaryImage,
  selectPrimaryImageForRoom,
  selectSecondaryImageForRoom
} from "../rooms";

function makeImage(
  overrides: Partial<DBListingImage> = {}
): DBListingImage {
  return {
    id: "img-1",
    listingId: "listing-1",
    userId: "user-1",
    filename: "image.jpg",
    url: "https://example.com/image.jpg",
    category: "kitchen",
    confidence: null,
    primaryScore: null,
    isPrimary: false,
    metadata: null,
    uploadedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides
  } as DBListingImage;
}

describe("videoGeneration/domain/rooms", () => {
  it("groups by category, excludes uncategorized, and sorts primary first", () => {
    const grouped = groupImagesByCategory([
      makeImage({
        id: "1",
        category: "kitchen",
        isPrimary: false,
        uploadedAt: new Date("2024-01-02T00:00:00Z")
      }),
      makeImage({
        id: "2",
        category: "kitchen",
        isPrimary: true,
        uploadedAt: new Date("2024-01-03T00:00:00Z")
      }),
      makeImage({
        id: "3",
        category: "kitchen",
        isPrimary: false,
        uploadedAt: new Date("2024-01-01T00:00:00Z")
      }),
      makeImage({ id: "4", category: null }),
      makeImage({ id: "5", category: "bedroom", url: "" })
    ]);

    const kitchen = grouped.get("kitchen") ?? [];
    expect(Array.from(grouped.keys())).toEqual(["kitchen"]);
    expect(kitchen.map((img) => img.id)).toEqual(["2", "3", "1"]);
  });

  it("builds rooms in canonical order with numbered categories", () => {
    const grouped = new Map<string, DBListingImage[]>([
      ["bedroom-2", [makeImage({ id: "b2", category: "bedroom-2" })]],
      ["kitchen", [makeImage({ id: "k1", category: "kitchen" })]],
      ["bedroom-1", [makeImage({ id: "b1", category: "bedroom-1" })]]
    ]);

    const rooms = buildRoomsFromImages(grouped);

    expect(rooms.map((room) => room.id)).toEqual([
      "kitchen",
      "bedroom-1",
      "bedroom-2"
    ]);
    expect(rooms[1]?.name).toBe("Bedroom 1");
    expect(rooms[2]?.name).toBe("Bedroom 2");
  });

  it("selects listing primary image and falls back for room primary", () => {
    const listingPrimary = selectListingPrimaryImage([
      makeImage({ id: "lp-1", isPrimary: true, url: "https://img/listing-primary.jpg" }),
      makeImage({ id: "lp-2", isPrimary: false, url: "https://img/other.jpg" })
    ]);

    const selected = selectPrimaryImageForRoom(
      { id: "bathroom", name: "Bathroom", category: "bathroom" },
      new Map([["bathroom", [makeImage({ category: "bathroom", isPrimary: false })]]]),
      listingPrimary.url
    );

    expect(selected).toBe("https://img/listing-primary.jpg");
  });

  it("throws when listing primary image is missing", () => {
    expect(() =>
      selectListingPrimaryImage([
        makeImage({ isPrimary: false, url: "https://img/1.jpg" })
      ])
    ).toThrow("Primary image missing for listing");
  });

  it("normalizes category from room id and numbered suffix", () => {
    expect(getCategoryForRoom({ id: "kitchen" })).toBe("kitchen");
    expect(getCategoryForRoom({ id: "bedroom-2" })).toBe("bedroom");
    expect(getCategoryForRoom({ id: "custom-room" })).toBe("custom-room");
  });

  it("selects secondary image by score and returns null when none", () => {
    const grouped = new Map([
      [
        "kitchen",
        [
          makeImage({
            id: "p",
            category: "kitchen",
            url: "https://img/primary.jpg",
            primaryScore: 0.1
          }),
          makeImage({
            id: "s1",
            category: "kitchen",
            url: "https://img/second-1.jpg",
            primaryScore: 0.9
          }),
          makeImage({
            id: "s2",
            category: "kitchen",
            url: "https://img/second-2.jpg",
            primaryScore: 0.5
          })
        ]
      ]
    ]) as Map<string, DBListingImage[]>;

    const selected = selectSecondaryImageForRoom(
      { id: "kitchen", name: "Kitchen", category: "kitchen" },
      grouped,
      "https://img/primary.jpg"
    );
    expect(selected).toBe("https://img/second-1.jpg");

    const none = selectSecondaryImageForRoom(
      { id: "bathroom", name: "Bathroom", category: "bathroom" },
      new Map([["bathroom", [makeImage({ category: "bathroom", url: "https://img/only.jpg" })]]]),
      "https://img/only.jpg"
    );
    expect(none).toBeNull();
  });
});
