import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingStageScaffold } from "@web/src/components/listings/stage/shared/ListingStageScaffold";
import { ListingStageFooter } from "@web/src/components/listings/stage/shared/ListingStageFooter";

describe("ListingStageScaffold", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("renders step header and details slot content", () => {
    render(
      <ListingStageScaffold
        steps={[
          { label: "1. Enter address", active: true, sublabel: "~30 sec" }
        ]}
        stepTitle="Step 1: Enter Listing Address"
        stepSubtitle="We use this to title the listing and populate listing details."
      >
        <div>details-panel-body</div>
      </ListingStageScaffold>
    );

    expect(
      screen.getByText("Step 1: Enter Listing Address")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We use this to title the listing and populate listing details."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("details-panel-body")).toBeInTheDocument();
  });
});

describe("ListingStageFooter", () => {
  it("disables continue based on canContinue", () => {
    render(
      <ListingStageFooter onContinue={() => undefined} canContinue={false} />
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("fires back and continue actions", async () => {
    const onContinue = jest.fn();
    const onBack = jest.fn();
    const user = userEvent.setup();
    render(
      <ListingStageFooter
        onContinue={onContinue}
        onBack={onBack}
        canBack
        canContinue
      />
    );

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
