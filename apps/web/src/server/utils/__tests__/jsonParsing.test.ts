import { parsePossiblyWrappedJson } from "@web/src/server/utils/jsonParsing";

describe("parsePossiblyWrappedJson", () => {
  it("parses normal JSON and passthrough non-string values", () => {
    expect(parsePossiblyWrappedJson('{"a":1}')).toEqual({ a: 1 });
    expect(parsePossiblyWrappedJson({ a: 1 })).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in extra text and returns null when invalid", () => {
    expect(parsePossiblyWrappedJson('prefix {"a":1} suffix')).toEqual({ a: 1 });
    expect(parsePossiblyWrappedJson("not-json")).toBeNull();
    expect(parsePossiblyWrappedJson(null)).toBeNull();
  });
});
