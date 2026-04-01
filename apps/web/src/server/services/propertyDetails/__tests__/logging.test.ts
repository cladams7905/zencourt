const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

jest.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args)
}));

import { writePropertyDetailsProviderLog } from "../logging";

describe("property details logging", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("skips writing logs during tests", async () => {
    process.env.NODE_ENV = "test";

    await writePropertyDetailsProviderLog({
      provider: "perplexity",
      address: "123 Main St",
      query: {
        systemPrompt: "system",
        userPrompt: "user",
        responseFormat: {}
      },
      response: { ok: true }
    });

    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("writes provider logs under the apps/web property details log directory", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await writePropertyDetailsProviderLog({
      provider: "perplexity",
      address: "123 Main St",
      query: {
        systemPrompt: "system",
        userPrompt: "user",
        responseFormat: { type: "json" }
      },
      response: { ok: true },
      openHouseOnlyResponse: { openHouse: true }
    });

    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringMatching(/apps\/web\/src\/server\/services\/propertyDetails\/logs$/),
      { recursive: true }
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/perplexity\.json$/),
      expect.stringContaining('"provider": "perplexity"'),
      "utf-8"
    );
  });

  it("falls back to a serializable payload when JSON serialization fails", async () => {
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await writePropertyDetailsProviderLog({
      provider: "perplexity",
      address: "123 Main St",
      query: {
        systemPrompt: "system",
        userPrompt: "user",
        responseFormat: circular
      },
      response: circular
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"error": "Unable to serialize payload"'),
      "utf-8"
    );
  });

  it("swallows filesystem write failures", async () => {
    mockMkdir.mockRejectedValueOnce(new Error("disk full"));

    await expect(
      writePropertyDetailsProviderLog({
        provider: "perplexity",
        address: "123 Main St",
        query: {
          systemPrompt: "system",
          userPrompt: "user",
          responseFormat: {}
        },
        response: { ok: true }
      })
    ).resolves.toBeUndefined();
  });
});
