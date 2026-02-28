export type ListingSidebarUpdate = {
  id: string;
  title?: string | null;
  listingStage?: string | null;
  lastOpenedAt?: string | Date | null;
};

const LISTING_SIDEBAR_EVENT = "listing-sidebar-update";
const listingSidebarHeartbeatAt = new Map<string, number>();

export function emitListingSidebarUpdate(update: ListingSidebarUpdate) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ListingSidebarUpdate>(LISTING_SIDEBAR_EVENT, {
      detail: update
    })
  );
}

export function emitListingSidebarHeartbeat(
  update: ListingSidebarUpdate,
  minIntervalMs = 60_000
) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const lastHeartbeatAt = listingSidebarHeartbeatAt.get(update.id) ?? 0;
  if (now - lastHeartbeatAt < minIntervalMs) {
    return;
  }
  listingSidebarHeartbeatAt.set(update.id, now);
  emitListingSidebarUpdate(update);
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
