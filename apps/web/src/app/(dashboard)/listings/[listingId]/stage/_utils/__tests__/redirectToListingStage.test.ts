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

  const stages = [
    "categorize",
    "complete",
    "generate",
    "review",
    "upload"
  ] as const;

  it.each(stages)(
    "does not redirect when stage matches expectedStage (%s)",
    (stage) => {
      expect(() =>
        redirectToListingStage("abc123", stage, stage)
      ).not.toThrow();
      expect(mockRedirect).not.toHaveBeenCalled();
    }
  );

  it("redirects to /stage/categorize when stage is categorize and expected is create", () => {
    expect(() =>
      redirectToListingStage("abc123", "categorize", "complete")
    ).toThrow("REDIRECT:/listings/abc123/stage/categorize");
  });

  it("redirects to /content when stage is create and expected is categorize", () => {
    expect(() =>
      redirectToListingStage("abc123", "complete", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/content");
  });

  it("redirects to /stage/generate when stage is generate", () => {
    expect(() =>
      redirectToListingStage("abc123", "generate", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/stage/generate");
  });

  it("redirects to /stage/review when stage is review", () => {
    expect(() =>
      redirectToListingStage("abc123", "review", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/stage/review");
  });

  it("redirects to /stage/upload when stage is upload", () => {
    expect(() =>
      redirectToListingStage("abc123", "upload", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/stage/upload");
  });

  it("always uses the passed listingId in the redirect URL", () => {
    expect(() =>
      redirectToListingStage("listing-xyz", "complete", "categorize")
    ).toThrow("REDIRECT:/listings/listing-xyz/content");
  });

  it("uses the default fallback for unknown stage values", () => {
    expect(() =>
      redirectToListingStage("abc123", "unknown-stage", "categorize")
    ).toThrow("REDIRECT:/listings/abc123/stage/categorize");
  });

  it("uses the provided fallback for unknown stage values", () => {
    expect(() =>
      redirectToListingStage("abc123", "unknown-stage", "categorize", "/listings/create")
    ).toThrow("REDIRECT:/listings/create");
  });
});
