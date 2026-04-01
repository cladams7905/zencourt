import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingAddressView } from "@web/src/components/listings/stage/address/ListingAddressView";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared/ListingStageViewContext";

function renderListingAddressView() {
  return render(
    <ListingStageViewProvider
      stage="address"
      title="Address"
      listingView={false}
    >
      <ListingAddressView googleMapsApiKey="test-key" />
    </ListingStageViewProvider>
  );
}

const mockPush = jest.fn();
const mockCreateListingForCurrentUser = jest.fn();
const mockUpdateListingForCurrentUser = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@web/src/components/location", () => ({
  AddressAutocomplete: ({
    value,
    onChange,
    onSelectAddress
  }: {
    value: string;
    onChange: (value: string) => void;
    onSelectAddress?: (selection: {
      formattedAddress: string;
      placeId: string;
    }) => void;
  }) => (
    <div>
      <input
        aria-label="Listing address"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label="Use suggested address"
        onClick={() =>
          onSelectAddress?.({
            formattedAddress:
              value.trim() || "123 Main Street, Seattle WA",
            placeId: "place-mock"
          })
        }
      >
        Use suggestion
      </button>
    </div>
  )
}));

jest.mock("@web/src/server/actions/listings/commands", () => ({
  createListingForCurrentUser: (...args: unknown[]) =>
    mockCreateListingForCurrentUser(...args),
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListingForCurrentUser(...args),
  touchListingActivityForCurrentUser: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

describe("ListingAddressView", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a listing and routes to listing upload", async () => {
    mockCreateListingForCurrentUser.mockResolvedValue({
      id: "listing-1",
      listingStage: "upload"
    });
    mockUpdateListingForCurrentUser.mockResolvedValue({
      id: "listing-1",
      listingStage: "upload"
    });

    renderListingAddressView();

    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "Listing address" }),
      "123 Main Street, Seattle WA"
    );
    await user.click(screen.getByRole("button", { name: "Use suggested address" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockCreateListingForCurrentUser).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith("listing-1", {
      title: "123 Main Street",
      address: "123 Main Street, Seattle WA",
      listingStage: "upload"
    });
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "listing-1",
        title: "123 Main Street",
        listingStage: "upload"
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/listings/listing-1/stage/upload");
  });

  it("keeps continue disabled without an address", () => {
    renderListingAddressView();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("keeps continue disabled when address is typed but not chosen from suggestions", async () => {
    renderListingAddressView();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "Listing address" }),
      "123 Main Street"
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });
});
