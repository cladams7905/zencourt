type TwemojiEntity = {
  text: string;
  indices: [number, number];
};

type TwemojiParse = (input: string) => TwemojiEntity[];

const { parse } = require("twemoji-parser") as {
  parse: TwemojiParse;
};

export type TextWithEmojiSegment =
  | { type: "text"; value: string }
  | { type: "emoji"; value: string; url: string };

function buildTwemojiUrl(emoji: string): string {
  const codePoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((value): value is string => Boolean(value))
    .join("-");

  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codePoints}.svg`;
}

export function splitTextWithEmojiUrls(
  text: string
): TextWithEmojiSegment[] {
  const entities = parse(text);
  if (entities.length === 0) {
    return [{ type: "text", value: text }];
  }

  const segments: TextWithEmojiSegment[] = [];
  let cursor = 0;

  for (const entity of entities) {
    const [start, end] = entity.indices;
    if (start > cursor) {
      segments.push({
        type: "text",
        value: text.slice(cursor, start)
      });
    }

    segments.push({
      type: "emoji",
      value: entity.text,
      url: buildTwemojiUrl(entity.text)
    });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({
      type: "text",
      value: text.slice(cursor)
    });
  }

  return segments;
}
