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
        stepTitle="Step 1: Enter Listing Address"
        stepSubtitle="We use this to title the listing and gather relevant information about the property."
      >
        <div>details-panel-body</div>
      </ListingStageScaffold>
    );

    expect(
      screen.getByText("Step 1: Enter Listing Address")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We use this to title the listing and gather relevant information about the property."
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

  it("renders an inline validation message when configured", () => {
    render(
      <ListingStageFooter
        onContinue={() => undefined}
        validationMessages={[
          "You need to plan at least one video clip to continue."
        ]}
      />
    );

    expect(
      screen.getByText("You need to plan at least one video clip to continue.")
    ).toBeInTheDocument();
  });

  it("does not render a validation message when none is provided", () => {
    render(<ListingStageFooter onContinue={() => undefined} />);

    expect(
      screen.queryByText(/you need to plan at least one video clip/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveTextContent(
      "Continue"
    );
  });

  it("keeps the continue text and does not render a warning icon in the button", () => {
    render(
      <ListingStageFooter
        onContinue={() => undefined}
        validationMessages={[
          "You need to plan at least one video clip to continue."
        ]}
      />
    );

    const continueButton = screen.getByRole("button", { name: "Continue" });

    expect(continueButton).toHaveTextContent("Continue");
    expect(continueButton.querySelector("svg")).toBeNull();
  });

  it("renders an over-limit inline validation message", () => {
    render(
      <ListingStageFooter
        onContinue={() => undefined}
        validationMessages={[
          'You are only allowed 10 videos per listing. Please move 2 scene(s) to "Unused photos" to continue.'
        ]}
      />
    );

    expect(
      screen.getByText(
        'You are only allowed 10 videos per listing. Please move 2 scene(s) to "Unused photos" to continue.'
      )
    ).toBeInTheDocument();
  });

  it("renders multiple validation messages when more than one rule is failing", () => {
    render(
      <ListingStageFooter
        onContinue={() => undefined}
        validationMessages={[
          "Remove any empty room categories to continue.",
          'You are only allowed 10 videos per listing. Please move 2 scene(s) to "Unused photos" to continue.'
        ]}
      />
    );

    expect(
      screen.getByText("Remove any empty room categories to continue.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'You are only allowed 10 videos per listing. Please move 2 scene(s) to "Unused photos" to continue.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("footer-validation-icon")).toHaveLength(2);
  });
});
