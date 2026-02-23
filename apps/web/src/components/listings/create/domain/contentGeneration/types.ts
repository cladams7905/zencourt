export type StreamedContentItem = {
  hook: string;
  body?: { header: string; content: string; broll_query?: string }[] | null;
  caption?: string | null;
  broll_query?: string | null;
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
};

export type ContentGenerationEvent =
  | { type: "delta"; text: string }
  | { type: "done"; items: FinalContentItem[] }
  | { type: "error"; message: string };
