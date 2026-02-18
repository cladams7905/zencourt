import { fetchWithTimeout } from "../http";

describe("marketData/providers/http", () => {
  it("passes through fetch options and signal", async () => {
    const response = { ok: true, status: 200 } as Response;
    const fetcher = jest.fn().mockResolvedValue(response);

    await expect(
      fetchWithTimeout(
        fetcher as unknown as typeof fetch,
        "https://example.com",
        { method: "POST" },
        1000
      )
    ).resolves.toBe(response);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts when timeout is reached", async () => {
    const fetcher = jest.fn(
      (_input: URL | string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            (error as Error & { name: string }).name = "AbortError";
            reject(error);
          });
        })
    );

    await expect(
      fetchWithTimeout(
        fetcher as unknown as typeof fetch,
        "https://example.com",
        {},
        5
      )
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
