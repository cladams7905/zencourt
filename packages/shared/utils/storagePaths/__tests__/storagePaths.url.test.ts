import {
  buildStoragePublicUrl,
  extractStorageKeyFromUrl,
  getStorageEndpointHost,
  isUrlFromStorageEndpoint
} from "..";

describe("storagePaths url helpers", () => {
  it("extracts key from s3 and path-style https urls", () => {
    expect(extractStorageKeyFromUrl("s3://bucket/user_1/file.png")).toBe(
      "user_1/file.png"
    );
    expect(
      extractStorageKeyFromUrl(
        "https://s3.us-west-002.backblazeb2.com/my-bucket/user_1/file.png"
      )
    ).toBe("user_1/file.png");
  });

  it("builds encoded public url", () => {
    expect(
      buildStoragePublicUrl(
        "https://s3.us-west-002.backblazeb2.com/",
        "bucket",
        "/user 1/a+b.png"
      )
    ).toBe("https://s3.us-west-002.backblazeb2.com/bucket/user%201/a%2Bb.png");
  });

  it("resolves endpoint host and endpoint ownership checks", () => {
    expect(
      getStorageEndpointHost("https://s3.us-west-002.backblazeb2.com")
    ).toBe("s3.us-west-002.backblazeb2.com");
    expect(
      isUrlFromStorageEndpoint(
        "https://bucket.s3.us-west-002.backblazeb2.com/key",
        "https://s3.us-west-002.backblazeb2.com"
      )
    ).toBe(true);
    expect(
      isUrlFromStorageEndpoint(
        "https://cdn.example.com/key",
        "https://s3.us-west-002.backblazeb2.com"
      )
    ).toBe(false);
  });
});
