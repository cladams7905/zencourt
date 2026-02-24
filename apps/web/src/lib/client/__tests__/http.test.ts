import {
  ClientHttpError,
  fetchApiData,
  fetchJson,
  fetchStreamResponse
} from "@web/src/lib/client/http";

describe("client/http", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    (global.fetch as unknown as jest.Mock).mockReset();
  });

  it("fetchJson returns parsed JSON for successful responses", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 42 })
    });

    await expect(fetchJson<{ value: number }>("/api/test")).resolves.toEqual({
      value: 42
    });
  });

  it("fetchApiData returns envelope data", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { name: "A" } })
    });

    await expect(fetchApiData<{ name: string }>("/api/test")).resolves.toEqual({
      name: "A"
    });
  });

  it("fetchStreamResponse returns response for ok status", async () => {
    const response = {
      ok: true,
      body: { getReader: jest.fn() }
    };
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce(response);

    await expect(fetchStreamResponse("/api/stream")).resolves.toBe(response);
  });

  it("throws ClientHttpError with payload message when available", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Bad request payload" })
    });

    await expect(fetchJson("/api/test")).rejects.toMatchObject({
      name: "ClientHttpError",
      message: "Bad request payload",
      status: 400
    });
  });

  it("uses fallback message when error payload is not JSON", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      }
    });

    await expect(
      fetchStreamResponse("/api/stream", undefined, "Fallback stream error")
    ).rejects.toMatchObject({
      name: "ClientHttpError",
      message: "Fallback stream error",
      status: 500
    });
  });

  it("uses unknown status when response has no numeric status", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("invalid json");
      }
    });

    await expect(fetchJson("/api/test")).rejects.toMatchObject({
      name: "ClientHttpError",
      message: "Request failed (unknown)",
      status: 0
    });
  });
});
