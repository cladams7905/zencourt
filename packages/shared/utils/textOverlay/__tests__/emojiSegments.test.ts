import { splitTextWithEmojiUrls } from "../renderer/emojis";

describe("splitTextWithEmojiUrls", () => {
  it("extracts emoji segments with deterministic asset urls", () => {
    expect(splitTextWithEmojiUrls("Hello 😀 home")).toEqual([
      { type: "text", value: "Hello " },
      {
        type: "emoji",
        value: "😀",
        url: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/1f600.svg"
      },
      { type: "text", value: " home" }
    ]);
  });

  it("preserves plain text when no emoji are present", () => {
    expect(splitTextWithEmojiUrls("Hello home")).toEqual([
      { type: "text", value: "Hello home" }
    ]);
  });
});
