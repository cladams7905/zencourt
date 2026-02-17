import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListingCategoryDeleteDialog } from "../ListingCategoryDeleteDialog";

describe("ListingCategoryDeleteDialog", () => {
  it("wires cancel and confirm callbacks", () => {
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();

    render(
      <ListingCategoryDeleteDialog
        open
        categoryLabel="Kitchen"
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Delete category" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
