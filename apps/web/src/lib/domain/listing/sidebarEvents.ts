export type ListingSidebarUpdate = {
  id: string;
  title?: string | null;
  listingStage?: string | null;
  lastOpenedAt?: string | Date | null;
};

const LISTING_SIDEBAR_EVENT = "listing-sidebar-update";

export function emitListingSidebarUpdate(update: ListingSidebarUpdate) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ListingSidebarUpdate>(LISTING_SIDEBAR_EVENT, {
      detail: update
    })
  );
}

export function addListingSidebarListener(
  handler: (update: ListingSidebarUpdate) => void
) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const custom = event as CustomEvent<ListingSidebarUpdate>;
    if (!custom.detail) return;
    handler(custom.detail);
  };
  window.addEventListener(LISTING_SIDEBAR_EVENT, listener);
  return () => window.removeEventListener(LISTING_SIDEBAR_EVENT, listener);
}
