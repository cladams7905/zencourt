export type OffsetPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
};

export type CursorPage<T> = {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
};
