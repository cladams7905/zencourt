/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { act } from "react";
import { render } from "@testing-library/react";
import { ListingCategorizeView } from "../ListingCategorizeView";

const mockPush = jest.fn();
const mockToastError = jest.fn();

let latestUploadProps: any = null;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("../../uploads/UploadDialog", () => ({
  UploadDialog: (props: any) => {
    latestUploadProps = props;
    return null;
  }
}));

jest.mock("../../location/AddressAutocomplete", () => ({
  AddressAutocomplete: () => null
}));

jest.mock("../ListingViewHeader", () => ({
  ListingViewHeader: () => null
}));

jest.mock("../ListingCategoryDialog", () => ({
  ListingCategoryDialog: () => null
}));

jest.mock("../ListingCategoryDeleteDialog", () => ({
  ListingCategoryDeleteDialog: () => null
}));

jest.mock("../ListingImageMoveDialog", () => ({
  ListingImageMoveDialog: () => null
}));

jest.mock("../ListingImageDeleteDialog", () => ({
  ListingImageDeleteDialog: () => null
}));

jest.mock("@web/src/lib/imageMetadata", () => ({
  getImageMetadataFromFile: jest.fn(() => Promise.resolve({}))
}));

const mockCreateListingImageRecords = jest.fn();
const mockDeleteListingImageUploads = jest.fn();

jest.mock("@web/src/server/actions/db/listings", () => ({
  createListingImageRecords: (...args: unknown[]) =>
    mockCreateListingImageRecords(...args),
  deleteListingImageUploads: (...args: unknown[]) =>
    mockDeleteListingImageUploads(...args),
  getListingImageUploadUrls: jest.fn(() =>
    Promise.resolve({ uploads: [], failed: [] })
  ),
  assignPrimaryListingImageForCategory: jest.fn(),
  updateListing: jest.fn(),
  updateListingImageAssignments: jest.fn()
}));

const baseProps = {
  title: "Listing Title",
  initialAddress: "",
  listingId: "listing-123",
  userId: "user-123",
  initialImages: [],
  googleMapsApiKey: "test-key",
  hasPropertyDetails: false
};

describe("ListingCategorizeView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockToastError.mockReset();
    mockCreateListingImageRecords.mockReset();
    mockDeleteListingImageUploads.mockReset();
    latestUploadProps = null;
  });

  it("navigates to processing when uploads complete", () => {
    render(<ListingCategorizeView {...baseProps} />);

    expect(latestUploadProps).not.toBeNull();

    latestUploadProps.onUploadsComplete({
      count: 2,
      batchStartedAt: 1234
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/listings/listing-123/categorize/processing?batch=2&batchStartedAt=1234"
    );
  });

  it("creates listing image records on upload success", async () => {
    render(<ListingCategorizeView {...baseProps} />);

    const records = [
      { key: "a", fileName: "a.jpg", publicUrl: "https://cdn/a" }
    ];

    mockCreateListingImageRecords.mockResolvedValue([
      {
        id: "img-1",
        url: "https://cdn/a",
        filename: "a.jpg",
        category: null,
        isPrimary: false,
        primaryScore: null
      }
    ]);

    await act(async () => {
      await latestUploadProps.onCreateRecords(records);
    });

    expect(mockCreateListingImageRecords).toHaveBeenCalledWith(
      baseProps.userId,
      baseProps.listingId,
      records
    );
    expect(mockDeleteListingImageUploads).not.toHaveBeenCalled();
  });

  it("cleans up uploads when record creation fails", async () => {
    render(<ListingCategorizeView {...baseProps} />);

    const records = [
      { key: "a", fileName: "a.jpg", publicUrl: "https://cdn/a" },
      { key: "b", fileName: "b.jpg", publicUrl: "https://cdn/b" }
    ];

    mockCreateListingImageRecords.mockRejectedValue(new Error("save failed"));
    mockDeleteListingImageUploads.mockResolvedValue(undefined);

    await act(async () => {
      await latestUploadProps.onCreateRecords(records);
    });

    expect(mockDeleteListingImageUploads).toHaveBeenCalledWith(
      baseProps.userId,
      baseProps.listingId,
      ["https://cdn/a", "https://cdn/b"]
    );
    expect(mockToastError).toHaveBeenCalled();
  });
});
