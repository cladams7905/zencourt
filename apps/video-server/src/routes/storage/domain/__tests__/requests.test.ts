import { Request } from "express";
import {
  parseBatchUploadRouteInput,
  parseDeleteRouteInput,
  parseSignedUrlRouteInput,
  parseUploadRouteInput
} from "@/routes/storage/domain/requests";

function makeFile(name: string): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: name,
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 3,
    buffer: Buffer.from("abc"),
    stream: null as never,
    destination: "",
    filename: name,
    path: ""
  };
}

describe("storage route request parsers", () => {
  it("parses upload request", () => {
    const req = {
      file: makeFile("a.jpg"),
      body: { folder: "uploads", userId: "u1", listingId: "l1", videoId: "v1" }
    } as unknown as Request;
    const parsed = parseUploadRouteInput(req);
    expect(parsed.file.originalname).toBe("a.jpg");
    expect(parsed.userId).toBe("u1");
  });

  it("parses delete request", () => {
    expect(parseDeleteRouteInput({ url: " https://x/y " })).toEqual({
      url: "https://x/y"
    });
  });

  it("parses signed url request with default expiry", () => {
    expect(parseSignedUrlRouteInput({ key: "path/a.jpg" })).toEqual({
      key: "path/a.jpg",
      expiresIn: 3600
    });
  });

  it("parses batch upload request", () => {
    const req = {
      files: [makeFile("a.jpg"), makeFile("b.jpg")],
      body: { folder: "x", userId: "u", listingId: "l" }
    } as unknown as Request;
    const parsed = parseBatchUploadRouteInput(req);
    expect(parsed.files).toHaveLength(2);
    expect(parsed.folder).toBe("x");
  });

  it("throws when upload request has no file", () => {
    const req = { body: { folder: "uploads" } } as unknown as Request;
    expect(() => parseUploadRouteInput(req)).toThrow("No file provided");
  });

  it("throws when delete request has no url", () => {
    expect(() => parseDeleteRouteInput({})).toThrow("No URL provided");
    expect(() => parseDeleteRouteInput({ url: "  " })).toThrow("No URL provided");
  });

  it("throws when signed url request has no key", () => {
    expect(() => parseSignedUrlRouteInput({})).toThrow("No key provided");
    expect(() => parseSignedUrlRouteInput({ key: "  " })).toThrow("No key provided");
  });

  it("throws when batch upload has no files", () => {
    const req = { files: [], body: {} } as unknown as Request;
    expect(() => parseBatchUploadRouteInput(req)).toThrow("No files provided");
  });

  it("uses default folder when not specified", () => {
    const req = {
      file: makeFile("a.jpg"),
      body: {}
    } as unknown as Request;
    const parsed = parseUploadRouteInput(req);
    expect(parsed.folder).toBe("uploads");
  });
});
