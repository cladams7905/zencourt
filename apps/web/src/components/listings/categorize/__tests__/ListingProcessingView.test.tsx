import * as React from "react";
import { act } from "react";
import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import { ListingProcessingView } from "../../ListingProcessingView";

const mockReplace = jest.fn();
const mockedCategorizeListingImages = jest.fn(() => Promise.resolve());
const mockedGetListingImages = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

const categorizeMock = mockedCategorizeListingImages as (
  ...a: unknown[]
) => unknown;
jest.mock("@web/src/server/actions/api/vision", () => ({
  categorizeListingImages: (...args: unknown[]) => categorizeMock(...args)
}));
jest.mock("@web/src/server/actions/api/listingProperty", () => ({
  fetchListingPropertyDetails: jest.fn()
}));

const getListingImagesMock = mockedGetListingImages as (
  ...a: unknown[]
) => unknown;
jest.mock("@web/src/server/actions/db/listings", () => ({
  getListingImages: (...args: unknown[]) => getListingImagesMock(...args),
  updateListing: jest.fn()
}));
jest.mock("sonner", () => ({
  toast: { error: jest.fn() }
}));

const baseProps = {
  mode: "categorize" as const,
  listingId: "listing-1",
  userId: "user-1",
  title: "Listing Title"
};

describe("ListingProcessingView", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockedCategorizeListingImages.mockReset();
    mockedGetListingImages.mockReset();
  });

  it("does not trigger categorization until images exist", async () => {
    mockedGetListingImages.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "image-1",
        category: null,
        uploadedAt: new Date().toISOString()
      }
    ]);

    const { unmount } = render(<ListingProcessingView {...baseProps} />);

    expect(screen.getByText("Processing listing photos")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockedGetListingImages).toHaveBeenCalledTimes(1)
    );
    expect(mockedCategorizeListingImages).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    await waitFor(() => {
      expect(mockedCategorizeListingImages).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  it("navigates to listing detail when all images are processed", async () => {
    mockedGetListingImages.mockResolvedValue([
      {
        id: "image-1",
        category: "kitchen",
        uploadedAt: new Date().toISOString()
      },
      {
        id: "image-2",
        category: "living-room",
        uploadedAt: new Date().toISOString()
      }
    ]);

    const { unmount } = render(<ListingProcessingView {...baseProps} />);

    await act(async () => {
      await waitFor(() => {
        expect(mockedGetListingImages).toHaveBeenCalledTimes(1);
      });
      await Promise.resolve(); // Flush microtasks so getListingImages resolution runs within act
    });

    const firstResult = await mockedGetListingImages.mock.results[0]?.value;
    expect(firstResult).toHaveLength(2);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/listings/listing-1/categorize");
    });

    unmount();
  });

  it("uses batchStartedAt to compute the progress counts", async () => {
    const batchStartedAt = Date.now();
    mockedGetListingImages.mockResolvedValue([
      {
        id: "image-old",
        category: "kitchen",
        uploadedAt: new Date(batchStartedAt - 5000).toISOString()
      },
      {
        id: "image-new",
        category: null,
        confidence: null,
        primaryScore: null,
        uploadedAt: new Date(batchStartedAt + 1000).toISOString()
      }
    ]);

    const { unmount } = render(
      <ListingProcessingView
        {...baseProps}
        batchStartedAt={batchStartedAt}
        batchCount={2}
      />
    );

    await waitFor(() => {
      expect(mockedGetListingImages).toHaveBeenCalledTimes(1);
    });

    const firstResult = await mockedGetListingImages.mock.results[0]?.value;
    expect(firstResult).toHaveLength(2);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    const countMatcher = (_: string, element: Element | null) =>
      element?.textContent?.replace(/\s+/g, "") === "1/2";

    await waitFor(() => {
      expect(screen.getAllByText(countMatcher).length).toBeGreaterThan(0);
    });

    unmount();
  });
});
