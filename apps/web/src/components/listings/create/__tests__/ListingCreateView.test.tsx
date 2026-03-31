import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingCreateView } from "@web/src/components/listings/create/ListingCreateView";

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
    onChange
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label="Listing address"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}));

jest.mock("@web/src/server/actions/listings/commands", () => ({
  createListingForCurrentUser: (...args: unknown[]) =>
    mockCreateListingForCurrentUser(...args),
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListingForCurrentUser(...args)
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

describe("ListingCreateView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a listing and routes to listing upload", async () => {
    mockCreateListingForCurrentUser.mockResolvedValue({
      id: "listing-1",
      listingStage: "categorize"
    });
    mockUpdateListingForCurrentUser.mockResolvedValue(undefined);

    render(<ListingCreateView googleMapsApiKey="test-key" />);

    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "Listing address" }),
      "123 Main Street, Seattle WA"
    );
    await user.click(
      screen.getByRole("button", { name: /continue to upload/i })
    );

    await waitFor(() => {
      expect(mockCreateListingForCurrentUser).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith("listing-1", {
      title: "123 Main Street",
      address: "123 Main Street, Seattle WA"
    });
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "listing-1",
        title: "123 Main Street",
        listingStage: "categorize"
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/listings/listing-1/upload");
  });

  it("keeps continue disabled without an address", () => {
    render(<ListingCreateView googleMapsApiKey="test-key" />);
    expect(
      screen.getByRole("button", { name: /continue to upload/i })
    ).toBeDisabled();
  });
});
