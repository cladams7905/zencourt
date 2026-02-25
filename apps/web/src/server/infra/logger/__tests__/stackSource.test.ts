import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findSourceMap } from "node:module";
import {
  getStructuredStackFrames,
  mapToOriginalSource,
  normalizeStackFileName,
  toAbsoluteFileUri
} from "@web/src/server/infra/logger/stackSource";

jest.mock("node:module", () => ({
  findSourceMap: jest.fn()
}));

const mockFindSourceMap = findSourceMap as unknown as jest.Mock;

describe("stackSource", () => {
  beforeEach(() => {
    mockFindSourceMap.mockReset();
  });

  describe("getStructuredStackFrames", () => {
    it("returns stack frames in structured format", () => {
      const frames = getStructuredStackFrames();
      expect(Array.isArray(frames)).toBe(true);
      expect(frames.length).toBeGreaterThan(0);
      expect(typeof frames[0]?.getFileName).toBe("function");
    });
  });

  describe("normalizeStackFileName", () => {
    it("converts file:// urls to file paths", () => {
      const url = "file:///tmp/example.ts";
      expect(normalizeStackFileName(url)).toBe(fileURLToPath(url));
    });

    it("returns regular paths unchanged", () => {
      expect(normalizeStackFileName("/tmp/example.ts")).toBe("/tmp/example.ts");
    });
  });

  describe("mapToOriginalSource", () => {
    it("returns original file path when source map is missing", () => {
      mockFindSourceMap.mockReturnValue(undefined);
      expect(mapToOriginalSource("/tmp/compiled.js", 1, 1)).toBe("/tmp/compiled.js");
    });

    it("maps webpack source paths to src paths", () => {
      mockFindSourceMap.mockReturnValue({
        findEntry: () => ({ originalSource: "webpack://_N_E/./src/app/page.tsx" })
      });
      expect(mapToOriginalSource("/tmp/compiled.js", 10, 20)).toBe("src/app/page.tsx");
    });

    it("maps file:// original sources to filesystem paths", () => {
      const sourceUrl = "file:///tmp/src/server/action.ts";
      mockFindSourceMap.mockReturnValue({
        findEntry: () => ({ originalSource: sourceUrl })
      });
      expect(mapToOriginalSource("/tmp/compiled.js", 10, 20)).toBe(fileURLToPath(sourceUrl));
    });

    it("falls back to filePath when sourcemap lookup throws", () => {
      mockFindSourceMap.mockImplementation(() => {
        throw new Error("boom");
      });
      expect(mapToOriginalSource("/tmp/compiled.js", 1, 1)).toBe("/tmp/compiled.js");
    });
  });

  describe("toAbsoluteFileUri", () => {
    it("returns file uri for absolute paths", () => {
      expect(toAbsoluteFileUri("/tmp/example.ts")).toBe("file:///tmp/example.ts");
    });

    it("resolves relative paths from cwd", () => {
      const expected = pathToFileURL(path.resolve(process.cwd(), "src/a.ts")).toString();
      expect(toAbsoluteFileUri("src/a.ts")).toBe(expected);
    });
  });
});
