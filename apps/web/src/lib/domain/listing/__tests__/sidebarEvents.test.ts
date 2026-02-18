import {
  addListingSidebarListener,
  emitListingSidebarUpdate
} from "@web/src/lib/domain/listing/sidebarEvents";

describe("sidebarEvents", () => {
  it("emits and receives listing sidebar updates", () => {
    const handler = jest.fn();
    const remove = addListingSidebarListener(handler);

    emitListingSidebarUpdate({ id: "listing-1", title: "Home" });
    expect(handler).toHaveBeenCalledWith({ id: "listing-1", title: "Home" });

    remove();
    emitListingSidebarUpdate({ id: "listing-2" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores events without detail payload", () => {
    const handler = jest.fn();
    const remove = addListingSidebarListener(handler);

    window.dispatchEvent(
      new CustomEvent("listing-sidebar-update", { detail: null as never })
    );

    expect(handler).not.toHaveBeenCalled();
    remove();
  });
});
