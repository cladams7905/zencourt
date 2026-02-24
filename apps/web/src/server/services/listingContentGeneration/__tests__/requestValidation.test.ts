/** @jest-environment node */

jest.mock("@web/src/server/utils/apiError", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
  StatusCode: { BAD_REQUEST: 400 }
}));

import { parseAndValidateParams } from "../requestValidation";

describe("requestValidation", () => {
  describe("parseAndValidateParams", () => {
    it("returns validated params for valid body and listingId", () => {
      const result = parseAndValidateParams(
        {
          subcategory: "new_listing",
          media_type: "image",
          focus: " backyard ",
          notes: " pool ",
          generation_nonce: " abc "
        },
        "listing-1"
      );

      expect(result).toEqual({
        listingId: "listing-1",
        subcategory: "new_listing",
        mediaType: "image",
        focus: "backyard",
        notes: "pool",
        generationNonce: "abc"
      });
    });

    it("defaults focus, notes, generationNonce to empty string when omitted", () => {
      const result = parseAndValidateParams(
        { subcategory: "open_house", media_type: "video" },
        "listing-2"
      );

      expect(result).toEqual({
        listingId: "listing-2",
        subcategory: "open_house",
        mediaType: "video",
        focus: "",
        notes: "",
        generationNonce: ""
      });
    });

    it("defaults media_type to video when empty string", () => {
      const result = parseAndValidateParams(
        { subcategory: "new_listing", media_type: "" },
        "listing-1"
      );

      expect(result.mediaType).toBe("video");
    });

    it("defaults media_type to video when media_type omitted", () => {
      const result = parseAndValidateParams(
        { subcategory: "new_listing" },
        "listing-1"
      );

      expect(result.mediaType).toBe("video");
    });

    it("accepts all LISTING_CONTENT_SUBCATEGORIES", () => {
      const subcategories = [
        "new_listing",
        "open_house",
        "price_change",
        "status_update",
        "property_features"
      ];

      for (const subcategory of subcategories) {
        const result = parseAndValidateParams(
          { subcategory, media_type: "image" },
          "listing-1"
        );
        expect(result.subcategory).toBe(subcategory);
      }
    });

    it("throws ApiError 400 when subcategory is invalid", () => {
      const utils = jest.requireMock("@web/src/server/utils/apiError");

      expect(() =>
        parseAndValidateParams(
          { subcategory: "invalid_subcategory", media_type: "image" },
          "listing-1"
        )
      ).toThrow(utils.ApiError);

      try {
        parseAndValidateParams(
          { subcategory: "invalid_subcategory", media_type: "image" },
          "listing-1"
        );
      } catch (err) {
        expect(err).toMatchObject({
          status: 400,
          body: {
            error: "Invalid request",
            message: "A valid listing subcategory is required"
          }
        });
      }
    });

    it("throws ApiError 400 when subcategory is missing", () => {
      const utils = jest.requireMock("@web/src/server/utils/apiError");

      expect(() =>
        parseAndValidateParams({ media_type: "image" }, "listing-1")
      ).toThrow(utils.ApiError);

      try {
        parseAndValidateParams({ media_type: "image" }, "listing-1");
      } catch (err) {
        expect((err as { body: { message: string } }).body.message).toBe(
          "A valid listing subcategory is required"
        );
      }
    });

    it("throws ApiError 400 when media_type is invalid", () => {
      const utils = jest.requireMock("@web/src/server/utils/apiError");

      expect(() =>
        parseAndValidateParams(
          { subcategory: "new_listing", media_type: "audio" },
          "listing-1"
        )
      ).toThrow(utils.ApiError);

      try {
        parseAndValidateParams(
          { subcategory: "new_listing", media_type: "audio" },
          "listing-1"
        );
      } catch (err) {
        expect((err as { body: { message: string } }).body.message).toBe(
          "media_type must be either 'video' or 'image'"
        );
      }
    });

    it("throws ApiError 400 when listingId is undefined", () => {
      const utils = jest.requireMock("@web/src/server/utils/apiError");

      expect(() =>
        parseAndValidateParams(
          { subcategory: "new_listing", media_type: "image" },
          undefined
        )
      ).toThrow(utils.ApiError);

      try {
        parseAndValidateParams(
          { subcategory: "new_listing", media_type: "image" },
          undefined
        );
      } catch (err) {
        expect((err as { body: { message: string } }).body.message).toBe(
          "Listing ID is required"
        );
      }
    });

    it("throws ApiError 400 when body is null and subcategory is required", () => {
      const utils = jest.requireMock("@web/src/server/utils/apiError");

      expect(() => parseAndValidateParams(null, "listing-1")).toThrow(utils.ApiError);
    });

    it("trims subcategory before validation", () => {
      const result = parseAndValidateParams(
        { subcategory: "  new_listing  ", media_type: "video" },
        "listing-1"
      );
      expect(result.subcategory).toBe("new_listing");
    });
  });
});
