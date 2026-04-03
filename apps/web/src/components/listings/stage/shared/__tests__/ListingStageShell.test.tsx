import * as React from "react";
import { render } from "@testing-library/react";
import { ListingStageShell } from "../ListingStageShell";
import { ListingStageViewProvider } from "../ListingStageViewContext";

jest.mock("../ListingStageTimeline", () => ({
  ListingStageTimeline: () => <div data-slot="mock-timeline" />
}));

jest.mock("../ListingStageScaffold", () => ({
  LISTING_STAGE_LG_MAIN_GRID_CLASS: "",
  LISTING_STAGE_MAIN_COLUMN_CLASS: "",
  LISTING_STAGE_NARROW_MAX_W_CLASS: "",
  LISTING_STAGE_WIDE_MAX_W_CLASS: "",
  ListingStageScaffold: ({
    children
  }: {
    children: React.ReactNode;
  }) => <div data-slot="mock-scaffold">{children}</div>
}));

jest.mock("../ListingStageViewHeader", () => {
  return {
    ListingStageViewHeader: React.forwardRef(function MockHeader(
      { action }: { action?: React.ReactNode },
      ref: React.ForwardedRef<HTMLElement>
    ) {
      return (
        <header ref={ref} data-slot="mock-header">
          <div>Header</div>
          {action}
        </header>
      );
    })
  };
});

jest.mock("../ListingStageDefaultFooter", () => ({
  ListingStageDefaultFooter: () => <div data-slot="mock-default-footer" />
}));

function createRect(height: number, width = 390) {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({})
  } as DOMRect;
}

describe("ListingStageShell", () => {
  let getBoundingClientRectSpy: jest.SpiedFunction<
    typeof HTMLElement.prototype.getBoundingClientRect
  >;

  beforeEach(() => {
    getBoundingClientRectSpy = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const slot = this.getAttribute("data-slot");

        if (slot === "listing-stage-scroll-viewport") {
          return createRect(390);
        }

        if (slot === "mock-header") {
          return createRect(88);
        }

        if (slot === "listing-stage-mobile-footer") {
          return createRect(180);
        }

        return createRect(0);
      });
  });

  afterEach(() => {
    getBoundingClientRectSpy.mockRestore();
  });

  it("reserves bottom clearance for the mobile footer and accessory", async () => {
    const { container } = render(
      <ListingStageViewProvider
        stage="plan"
        title="123 Main St"
        listingView={false}
        hideCreateButton
        listingId="listing-1"
      >
        <ListingStageShell
          stage="plan"
          footer={<div>Footer actions</div>}
          footerAccessory={<div>Footer accessory</div>}
        >
          <div>Step body</div>
        </ListingStageShell>
      </ListingStageViewProvider>
    );

    const scrollViewport = container.querySelector(
      '[data-slot="listing-stage-scroll-viewport"]'
    );
    const mobileFooter = container.querySelector(
      '[data-slot="listing-stage-mobile-footer"]'
    );
    const contentSection = container.querySelector(
      '[data-slot="listing-stage-scroll-viewport"] section'
    );

    expect(scrollViewport).not.toBeNull();
    expect(mobileFooter).not.toBeNull();
    expect(contentSection).not.toBeNull();
    expect(mobileFooter).toHaveTextContent("Footer accessory");

    expect(mobileFooter).not.toHaveClass("max-md:fixed");
    expect(contentSection).toHaveStyle({ minHeight: "122px" });
  });
});
