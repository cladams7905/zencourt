import { render, screen } from "@testing-library/react";
import ListingGeneratePage from "@web/src/app/(dashboard)/listings/[listingId]/stage/generate/page";

const mockRequireUserOrRedirect = jest.fn();
const mockGetListingById = jest.fn();
const mockGetLatestVideoGenBatchByListingId = jest.fn();
const mockRedirectToListingStage = jest.fn();

jest.mock("@web/src/server/infra/logger/callContext", () => ({
  runWithCaller: (_name: string, callback: () => Promise<unknown>) => callback()
}));

jest.mock("@web/src/app/(dashboard)/_utils/requireUserOrRedirect", () => ({
  requireUserOrRedirect: () => mockRequireUserOrRedirect()
}));

jest.mock("@web/src/server/models/listings", () => ({
  getListingById: (...args: unknown[]) => mockGetListingById(...args)
}));

jest.mock("@web/src/server/models/video", () => ({
  getLatestVideoGenBatchByListingId: (...args: unknown[]) =>
    mockGetLatestVideoGenBatchByListingId(...args)
}));

jest.mock(
  "@web/src/app/(dashboard)/listings/[listingId]/_utils/redirectToListingStage",
  () => ({
    redirectToListingStage: (...args: unknown[]) =>
      mockRedirectToListingStage(...args)
  })
);

jest.mock("@web/src/components/listings/processing", () => ({
  ListingProcessingView: (props: {
    mode: string;
    listingId: string;
    initialBatchId?: string | null;
    title: string;
  }) => (
    <div
      data-testid="processing-view"
      data-initial-batch-id={props.initialBatchId ?? ""}
      data-mode={props.mode}
    >
      {props.title}
    </div>
  )
}));

describe("ListingGeneratePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUserOrRedirect.mockResolvedValue({ id: "user-1" });
    mockGetListingById.mockResolvedValue({
      id: "listing-1",
      title: "123 Main",
      listingStage: "generate"
    });
  });

  it("passes through an active batch id for pending generation", async () => {
    mockGetLatestVideoGenBatchByListingId.mockResolvedValue({
      id: "batch-1",
      status: "pending"
    });

    render(
      await ListingGeneratePage({
        params: Promise.resolve({ listingId: "listing-1" })
      })
    );

    expect(mockRedirectToListingStage).toHaveBeenCalledWith(
      "listing-1",
      "generate",
      "generate",
      "/listings/create"
    );
    expect(screen.getByTestId("processing-view")).toHaveAttribute(
      "data-initial-batch-id",
      "batch-1"
    );
  });

  it("does not resume a terminal failed batch", async () => {
    mockGetLatestVideoGenBatchByListingId.mockResolvedValue({
      id: "batch-failed",
      status: "failed"
    });

    render(
      await ListingGeneratePage({
        params: Promise.resolve({ listingId: "listing-1" })
      })
    );

    expect(screen.getByTestId("processing-view")).toHaveAttribute(
      "data-initial-batch-id",
      ""
    );
  });
});
