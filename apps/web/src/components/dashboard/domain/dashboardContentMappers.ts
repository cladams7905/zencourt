import type {
  DashboardContentItem,
  DashboardStreamItem,
  GeneratedContentState
} from "@web/src/components/dashboard/shared";

export function createContentItemId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function mapStreamItemsToContentItems(
  items: DashboardStreamItem[]
): DashboardContentItem[] {
  return items.map((item) => ({
    id: createContentItemId("stream"),
    aspectRatio: "square",
    isFavorite: false,
    hook: item.hook,
    caption: item.caption ?? null,
    body: item.body ?? null,
    brollQuery: item.broll_query ?? null
  }));
}

export function mapDoneItemsToContentItems(
  items: DashboardStreamItem[]
): DashboardContentItem[] {
  return items.map((item) => ({
    id: createContentItemId("generated"),
    aspectRatio: "square",
    isFavorite: false,
    hook: item.hook,
    caption: item.caption ?? null,
    body: item.body ?? null,
    brollQuery: item.broll_query ?? null
  }));
}

export function replaceStreamItemsWithDoneItems(
  currentItems: DashboardContentItem[],
  doneItems: DashboardContentItem[]
): DashboardContentItem[] {
  return [...currentItems.filter((item) => !item.id.startsWith("stream-")), ...doneItems];
}

export function removeStreamItems(items: DashboardContentItem[]): DashboardContentItem[] {
  return items.filter((item) => !item.id.startsWith("stream-"));
}

export function toggleFavoriteAcrossGenerated(
  current: GeneratedContentState,
  id: string
): GeneratedContentState {
  return {
    videos: toggleFavoriteByType(current.videos, id),
    posts: toggleFavoriteByType(current.posts, id),
    stories: toggleFavoriteByType(current.stories, id)
  };
}

function toggleFavoriteByType(
  categoryMap: GeneratedContentState["videos"],
  id: string
): GeneratedContentState["videos"] {
  return Object.fromEntries(
    Object.entries(categoryMap).map(([key, items]) => [
      key,
      items.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    ])
  ) as GeneratedContentState["videos"];
}
