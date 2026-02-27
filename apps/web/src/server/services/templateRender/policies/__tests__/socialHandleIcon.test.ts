import { applySocialHandleIconPolicy } from "../socialHandleIcon";

describe("templateRender/policies/socialHandleIcon", () => {
  it("sets transparent icon URL when socialHandle is missing", () => {
    const result = applySocialHandleIconPolicy({
      resolvedParameters: {
        headerText: "A Header"
      }
    });

    expect(result.socialHandleIcon).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif"
    );
  });

  it("sets instagram icon URL when socialHandle is configured", () => {
    const result = applySocialHandleIconPolicy({
      resolvedParameters: {
        socialHandle: "@agent"
      }
    });

    expect(result.socialHandleIcon).toBe(
      "https://cdn.orshot.com/elements/icons/logos/instagram.svg"
    );
  });
});
