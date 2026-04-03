import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingCategoryDialog } from "@web/src/components/listings/stage/plan/subcomponents/dialogs/ListingCategoryDialog";

describe("ListingCategoryDialog", () => {
  beforeAll(() => {
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.setPointerCapture = () => {};
    HTMLElement.prototype.releasePointerCapture = () => {};
    HTMLElement.prototype.scrollIntoView = () => {};
  });

  it("uses space terminology in add mode", () => {
    render(
      <ListingCategoryDialog
        open
        mode="add"
        existingCategories={[]}
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText("Add a space")).toBeInTheDocument();
    expect(
      screen.getByText("Add a new property space to your video plan.")
    ).toBeInTheDocument();
    expect(screen.getByText("Space")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Select a space");
  });

  it("shows the category name in the edit header", () => {
    render(
      <ListingCategoryDialog
        open
        mode="edit"
        initialCategory="Kitchen"
        existingCategories={["kitchen"]}
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText("Edit Kitchen")).toBeInTheDocument();
  });

  it("filters add-mode built-in options to available spaces while keeping multi-space categories and custom", async () => {
    const user = userEvent.setup();

    render(
      <ListingCategoryDialog
        open
        mode="add"
        existingCategories={["kitchen", "living-room", "bedroom", "bedroom-2"]}
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.queryByRole("option", { name: "Kitchen" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Living Room" })
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Bedroom" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bathroom" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Custom…" })).toBeInTheDocument();
  });
});
