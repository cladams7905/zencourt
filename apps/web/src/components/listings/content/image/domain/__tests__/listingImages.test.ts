import {
  buildVariedImageSequence,
  rankListingImagesForItem
} from "../listingImages";

jest.mock(
  "@web/src/components/listings/content/domain/shared/utils",
  () => ({
    buildFeatureNeedle: jest.fn()
  })
);

import { buildFeatureNeedle } from "@web/src/components/listings/content/domain/shared/utils";

const mockBuildFeatureNeedle = jest.mocked(buildFeatureNeedle);

describe("listingImages", () => {
  beforeEach(() => {
    mockBuildFeatureNeedle.mockReset();
  });

  it("ranks room shots before detail shots, then category matches, score, and recency", () => {
    mockBuildFeatureNeedle.mockReturnValue("kitchen island");

    const ranked = rankListingImagesForItem(
      [
        {
          id: "detail-match",
          url: "https://img/1.jpg",
          category: "kitchen",
          recommendationScore: 1,
          shotType: "detail",
          uploadedAtMs: 10
        },
        {
          id: "room-nonmatch-high-score",
          url: "https://img/2.jpg",
          category: "bedroom",
          recommendationScore: 10,
          shotType: "room",
          uploadedAtMs: 20
        },
        {
          id: "room-match-lower-score",
          url: "https://img/3.jpg",
          category: "kitchen",
          recommendationScore: 2,
          shotType: "room",
          uploadedAtMs: 30
        },
        {
          id: "room-match-newer",
          url: "https://img/4.jpg",
          category: "kitchen",
          recommendationScore: 2,
          shotType: "room",
          uploadedAtMs: 40
        }
      ],
      { id: "item-1" } as never
    );

    expect(ranked.map((image) => image.id)).toEqual([
      "room-match-newer",
      "room-match-lower-score",
      "room-nonmatch-high-score",
      "detail-match"
    ]);
  });

  it("returns a deterministic permutation for the same seed", () => {
    const images = [
      { id: "a", url: "a", category: null, recommendationScore: null, uploadedAtMs: 1 },
      { id: "b", url: "b", category: null, recommendationScore: null, uploadedAtMs: 2 },
      { id: "c", url: "c", category: null, recommendationScore: null, uploadedAtMs: 3 },
      { id: "d", url: "d", category: null, recommendationScore: null, uploadedAtMs: 4 }
    ];

    const first = buildVariedImageSequence(images, "seed-1");
    const second = buildVariedImageSequence(images, "seed-1");

    expect(first.map((image) => image.id)).toEqual(second.map((image) => image.id));
    expect(first.map((image) => image.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("returns the original array when there is at most one image", () => {
    const single = [
      {
        id: "only",
        url: "https://img/only.jpg",
        category: null,
        recommendationScore: null,
        uploadedAtMs: 1
      }
    ];

    expect(buildVariedImageSequence(single, "seed")).toBe(single);
    expect(buildVariedImageSequence([], "seed")).toEqual([]);
  });
});
