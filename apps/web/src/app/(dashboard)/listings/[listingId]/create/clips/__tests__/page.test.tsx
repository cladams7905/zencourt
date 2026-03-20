import { render, screen } from "@testing-library/react";
import ListingCreateClipsPage from "@web/src/app/(dashboard)/listings/[listingId]/create/clips/page";

const mockRequireUserOrRedirect = jest.fn();
const mockGetListingById = jest.fn();
const mockRedirectToListingStage = jest.fn();
const mockGetListingClipVersionItemsForCurrentUser = jest.fn();
const mockListingViewHeader = jest.fn();

jest.mock("@web/src/server/infra/logger/callContext", () => ({
  runWithCaller: (_name: string, callback: () => Promise<unknown>) => callback()
}));

jest.mock("@web/src/app/(dashboard)/_utils/requireUserOrRedirect", () => ({
  requireUserOrRedirect: () => mockRequireUserOrRedirect()
}));

jest.mock("@web/src/server/models/listings", () => ({
  getListingById: (...args: unknown[]) => mockGetListingById(...args)
}));

jest.mock(
  "@web/src/app/(dashboard)/listings/[listingId]/_utils/redirectToListingStage",
  () => ({
    redirectToListingStage: (...args: unknown[]) =>
      mockRedirectToListingStage(...args)
  })
);

jest.mock("@web/src/server/actions/listings/queries", () => ({
  getListingClipVersionItemsForCurrentUser: (...args: unknown[]) =>
    mockGetListingClipVersionItemsForCurrentUser(...args)
}));

jest.mock(
  "@web/src/components/listings/create/components/ListingClipManager",
  () => ({
    ListingClipManager: ({
      listingId
    }: {
      listingId: string;
      items: unknown[];
      mode: string;
    }) => <div data-testid="clip-manager">{listingId}</div>
    ,
    ListingClipManagerBackButton: ({ href }: { href: string }) => (
      <a href={href}>Back to create</a>
    )
  })
);

jest.mock("@web/src/components/listings/shared", () => ({
  ListingViewHeader: (props: {
    title: string;
    subtitle?: string;
    showCreate?: boolean;
    showNotifications?: boolean;
  }) => {
    mockListingViewHeader(props);
    return <div data-testid="listing-view-header">{props.title}</div>;
  }
}));

describe("ListingCreateClipsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUserOrRedirect.mockResolvedValue({ id: "user-1" });
    mockGetListingById.mockResolvedValue({
      id: "listing-1",
      title: "123 Main",
      listingStage: "create"
    });
    mockGetListingClipVersionItemsForCurrentUser.mockResolvedValue([]);
  });

  it("renders a back link to create and preserves search params", async () => {
    render(
      await ListingCreateClipsPage({
        params: Promise.resolve({ listingId: "listing-1" }),
        searchParams: Promise.resolve({
          mediaType: "videos",
          filter: "property_features",
          page: "2"
        })
      })
    );

    expect(mockRedirectToListingStage).toHaveBeenCalledWith(
      "listing-1",
      "create",
      "create"
    );
    expect(mockGetListingClipVersionItemsForCurrentUser).toHaveBeenCalledWith(
      "listing-1"
    );
    expect(screen.getByTestId("listing-view-header")).toHaveTextContent(
      "123 Main"
    );
    expect(mockListingViewHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "123 Main"
      })
    );
    expect(screen.getByText("0 clips")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to create/i })).toHaveAttribute(
      "href",
      "/listings/listing-1/create?mediaType=videos&filter=property_features&page=2"
    );
    expect(screen.getByTestId("clip-manager")).toHaveTextContent("listing-1");
  });
});
