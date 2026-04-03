/**
 * @jest-environment node
 */

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
}));

import { redirect } from "next/navigation";

import {
  enforceListingStageAccess,
  redirectToListingStage
} from "../redirectToListingStage";

const mockRedirect = jest.mocked(redirect);

describe("redirectToListingStage", () => {
  beforeEach(() => mockRedirect.mockClear());

  it("allows current stage access", () => {
    expect(() =>
      enforceListingStageAccess("abc123", "plan", "plan")
    ).not.toThrow();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows previous stage access", () => {
    expect(() =>
      enforceListingStageAccess("abc123", "review", "plan")
    ).not.toThrow();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects future stage access back to current stage", () => {
    expect(() =>
      enforceListingStageAccess("abc123", "plan", "review")
    ).toThrow("REDIRECT:/listings/abc123/stage/plan");
  });

  it("redirects complete listings to content when a stage route is requested", () => {
    expect(() =>
      enforceListingStageAccess("abc123", "complete", "plan")
    ).toThrow("REDIRECT:/listings/abc123/content");
  });

  it("always uses the passed listingId in the redirect URL", () => {
    expect(() =>
      enforceListingStageAccess("listing-xyz", "complete", "plan")
    ).toThrow("REDIRECT:/listings/listing-xyz/content");
  });

  it("uses the default fallback for unknown stage values", () => {
    expect(() =>
      enforceListingStageAccess("abc123", "unknown-stage", "plan")
    ).toThrow("REDIRECT:/listings/abc123/stage/plan");
  });

  it("uses the provided fallback for unknown stage values", () => {
    expect(() =>
      enforceListingStageAccess(
        "abc123",
        "unknown-stage",
        "plan",
        "/listings/create"
      )
    ).toThrow("REDIRECT:/listings/create");
  });

  it("keeps exact-match behavior for complete route checks", () => {
    expect(() =>
      redirectToListingStage("abc123", "complete", "complete")
    ).not.toThrow();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects content requests back to the current unlocked stage when incomplete", () => {
    expect(() =>
      redirectToListingStage("abc123", "review", "complete")
    ).toThrow("REDIRECT:/listings/abc123/stage/review");
  });
});
