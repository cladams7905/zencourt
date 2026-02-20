import axios from "axios";
import { downloadBufferWithRetry } from "@/services/videoGeneration/domain/downloadWithRetry";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("downloadWithRetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("downloads with checksum when requested", async () => {
    mockedAxios.get.mockResolvedValue({
      data: Buffer.from("hello"),
      headers: {}
    } as never);

    const result = await downloadBufferWithRetry({
      url: "https://example.com/file",
      validateSize: false,
      computeChecksum: true
    });

    expect(result.buffer.toString()).toBe("hello");
    expect(result.checksumSha256).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("retries and succeeds on a later attempt", async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({
        data: Buffer.from("ok"),
        headers: {}
      } as never);

    const result = await downloadBufferWithRetry({
      url: "https://example.com/retry",
      maxAttempts: 2,
      baseDelayMs: 1,
      validateSize: false
    });

    expect(result.buffer.toString()).toBe("ok");
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it("throws on size mismatch", async () => {
    mockedAxios.get.mockResolvedValue({
      data: Buffer.from("abc"),
      headers: { "content-length": "4" }
    } as never);

    await expect(
      downloadBufferWithRetry({
        url: "https://example.com/bad-size",
        maxAttempts: 1
      })
    ).rejects.toThrow("Download size mismatch");
  });

});
