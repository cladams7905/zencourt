import { computeOverlayLineStyles } from "..";

describe("computeOverlayLineStyles", () => {
  it("uses legacy fallback styling when lines are absent", () => {
    const styles = computeOverlayLineStyles(
      {
        text: "HELLO WORLD",
        background: "none",
        font: "serif-classic",
        position: "center",
        templatePattern: "simple"
      },
      60
    );

    expect(styles).toHaveLength(1);
    expect(styles[0]?.text).toBe("Hello World");
    expect(styles[0]?.fontSize).toBe(60);
    expect(styles[0]?.textShadow).toContain("rgba(0, 0, 0");
  });

  it("applies pairing/template style decisions for structured lines", () => {
    const styles = computeOverlayLineStyles(
      {
        text: "ignored",
        background: "black",
        font: "sans-modern",
        position: "center",
        templatePattern: "accent-headline",
        fontPairing: "block-rouge-italiana",
        lines: [
          { text: "Headline", fontRole: "headline" },
          { text: "Accent", fontRole: "accent" }
        ]
      },
      50
    );

    expect(styles).toHaveLength(2);
    expect(styles[0]?.textTransform).toBe("uppercase");
    expect(styles[0]?.text).toBe("HEADLINE");
    expect(styles[1]?.text).toBe("accent");
    expect(styles[1]?.fontStyle).toBe("normal");
  });

  it("uses italiana letter spacing override for headline role", () => {
    const styles = computeOverlayLineStyles(
      {
        text: "ignored",
        background: "black",
        font: "serif-classic",
        position: "center",
        templatePattern: "accent-headline",
        fontPairing: "serif-italiana-rouge",
        lines: [{ text: "Headline", fontRole: "headline" }]
      },
      40
    );

    expect(styles[0]?.letterSpacing).toBe("-0.05em");
  });
});
