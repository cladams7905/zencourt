/**
 * @jest-environment node
 */

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
}));

import { redirect } from "next/navigation";

import { redirectToListingStage } from "../redirectToListingStage";

const mockRedirect = jest.mocked(redirect);

describe("redirectToListingStage", () => {
  beforeEach(() => mockRedirect.mockClear());

  const stages = ["categorize", "create", "generate", "review"] as const;

  it.each(stages)(
    "does not redirect when stage matches expectedStage (%s)",
    (stage) => {
      expect(() =>
        redirectToListingStage("abc123", stage, stage)
      ).not.toThrow();
      expect(mockRedirect).not.toHaveBeenCalled();
    }
  );

  it("redirects to /categorize when stage is categorize and expected is create", () => {
    expect(() =>
      redirectToListingStage("abc123", "categorize", "create")
    ).toThrow("REDIRECT:/listings/abc123/categorize");
  });

  it("redirects to /create when stage is create and expected is categorize", () => {
    expect(() =>
      redirectToListingStage("abc123", "create", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/create");
  });

  it("redirects to /generate when stage is generate", () => {
    expect(() =>
      redirectToListingStage("abc123", "generate", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/generate");
  });

  it("redirects to /review when stage is review", () => {
    expect(() =>
      redirectToListingStage("abc123", "review", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/review");
  });

  it("always uses the passed listingId in the redirect URL", () => {
    expect(() =>
      redirectToListingStage("listing-xyz", "create", "categorize")
    ).toThrow("REDIRECT:/listings/listing-xyz/create");
  });

  it("uses the default fallback for unknown stage values", () => {
    expect(() =>
      redirectToListingStage("abc123", "unknown-stage", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/categorize");
  });

  it("uses the provided fallback for unknown stage values", () => {
    expect(() =>
      redirectToListingStage("abc123", "unknown-stage", "categorize", "/listings/sync")
    ).toThrow("REDIRECT:/listings/sync");
  });
});
