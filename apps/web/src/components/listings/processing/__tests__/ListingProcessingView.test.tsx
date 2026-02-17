import * as React from "react";
import { act } from "react";
import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import { ListingProcessingView } from "../ListingProcessingView";

const mockReplace = jest.fn();
const mockedCategorizeListingImages = jest.fn(() => Promise.resolve());
const mockedGetListingImages = jest.fn();
const mockedFetchListingPropertyDetails = jest.fn();
const mockedUpdateListing = jest.fn();
const mockedToastError = jest.fn();

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
  fetchListingPropertyDetails: (...args: unknown[]) =>
    mockedFetchListingPropertyDetails(...args)
}));

const getListingImagesMock = mockedGetListingImages as (
  ...a: unknown[]
) => unknown;
jest.mock("@web/src/server/actions/db/listings", () => ({
  getListingImages: (...args: unknown[]) => getListingImagesMock(...args),
  updateListing: (...args: unknown[]) => mockedUpdateListing(...args)
}));
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockedToastError(...args) }
}));

const baseProps = {
  mode: "categorize" as const,
  listingId: "listing-1",
  userId: "user-1",
  title: "Listing Title"
};

describe("ListingProcessingView", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockReplace.mockReset();
    mockedCategorizeListingImages.mockReset();
    mockedGetListingImages.mockReset();
    mockedFetchListingPropertyDetails.mockReset();
    mockedUpdateListing.mockReset();
    mockedToastError.mockReset();
    (global.fetch as unknown as jest.Mock).mockReset();
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

  it("uses batchStartedAt to filter processing completion", async () => {
    const batchStartedAt = Date.now();
    mockedGetListingImages
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([
        {
          id: "image-old",
          category: "kitchen",
          uploadedAt: new Date(batchStartedAt - 5000).toISOString()
        },
        {
          id: "image-new",
          category: "bedroom",
          confidence: 0.92,
          primaryScore: 0.8,
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

    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/listings/listing-1/categorize");
    });

    unmount();
  });

  it("shows retry UI when review property fetch fails", async () => {
    mockedFetchListingPropertyDetails.mockRejectedValue(
      new Error("IDX unavailable")
    );

    render(
      <ListingProcessingView
        mode="review"
        listingId="listing-1"
        userId="user-1"
        title="Listing Title"
        address="123 Main St"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Property lookup failed")).toBeInTheDocument();
    });

    expect(screen.getByText("IDX unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry fetch" })).toBeVisible();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to review when generate initialization fails", async () => {
    (global.fetch as unknown as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/video/status/")) {
          return {
            ok: true,
            json: async () => ({ success: true, data: { jobs: [] } })
          } as Response;
        }
        if (url.includes("/api/v1/video/generate")) {
          return {
            ok: false,
            json: async () => ({ message: "Failed to start generation." })
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({})
        } as Response;
      }
    );

    mockedUpdateListing.mockResolvedValue(undefined);

    render(
      <ListingProcessingView
        mode="generate"
        listingId="listing-1"
        userId="user-1"
        title="Listing Title"
      />
    );

    await waitFor(() => {
      expect(mockedUpdateListing).toHaveBeenCalledWith("user-1", "listing-1", {
        listingStage: "review"
      });
    });

    expect(mockReplace).toHaveBeenCalledWith("/listings/listing-1/review");
    expect(mockedToastError).toHaveBeenCalled();
  });
});
