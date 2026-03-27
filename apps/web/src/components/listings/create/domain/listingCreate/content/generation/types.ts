export type StreamedContentItem = {
  hook: string;
  body?: { header: string; content: string; broll_query?: string }[] | null;
  caption?: string | null;
  broll_query?: string | null;
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
};

export type FinalContentItem = {
  hook: string;
  body?:
    | {
        header: string;
        content: string;
        broll_query?: string | null;
      }[]
    | null;
  caption?: string | null;
  broll_query?: string | null;
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
};

export type ContentGenerationEvent =
  | {
      type: "meta";
      meta: { cache_key_timestamp?: number };
    }
  | { type: "delta"; text: string }
  | {
      type: "done";
      items: FinalContentItem[];
      meta?: { cache_key_timestamp?: number };
    }
  | { type: "error"; message: string };
