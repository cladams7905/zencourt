import { createTemplateRenderer } from "../client";

const ORSHOT_RENDER_URL = "https://api.orshot.com/v1/studio/render";

function mockFetch(responses: Array<{ ok: boolean; body: unknown; status?: number }>) {
  const fn = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  for (const res of responses) {
    const status = res.status ?? (res.ok ? 200 : 500);
    fn.mockResolvedValueOnce({
      ok: res.ok,
      status,
      json: () => Promise.resolve(res.body),
      text: () => Promise.resolve(JSON.stringify(res.body))
    } as Response);
  }
  return fn;
}

describe("templateRender/providers/orshot/client", () => {
  afterEach(() => {
    delete process.env.ORSHOT_API_KEY;
  });

  it("throws when API key is missing", async () => {
    const fetchFn = jest.fn();
    const render = createTemplateRenderer({
      apiKey: " ",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({
        templateId: "template-1",
        modifications: {}
      })
    ).rejects.toThrow("ORSHOT_API_KEY must be configured");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("calls fetch with correct URL, method, headers and body", async () => {
    const fetchFn = mockFetch([
      {
        ok: true,
        body: { data: { content: "data:image/png;base64,ZmFrZS1pbWFnZQ==" } }
      }
    ]);
    const render = createTemplateRenderer({
      apiKey: "test-key",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({
        templateId: "template-1",
        modifications: { headerText: "Hello" }
      })
    ).resolves.toBe("data:image/png;base64,ZmFrZS1pbWFnZQ==");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      ORSHOT_RENDER_URL,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-key"
        }
      })
    );
    const [, init] = fetchFn.mock.calls[0] as [RequestInfo | URL, RequestInit];
    const callBody = JSON.parse(init.body as string);
    expect(callBody).toEqual({
      templateId: "template-1",
      modifications: { headerText: "Hello" },
      response: { type: "base64", format: "png" }
    });
  });

  it("normalizes single-page response with raw base64 to data url", async () => {
    const fetchFn = mockFetch([
      { ok: true, body: { data: { content: "ZmFrZS1pbWFnZQ==" } } }
    ]);
    const render = createTemplateRenderer({
      apiKey: "test-key",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({ templateId: "t1", modifications: {} })
    ).resolves.toBe("data:image/png;base64,ZmFrZS1pbWFnZQ==");
  });

  it("preserves single-page response when content is already data url", async () => {
    const fetchFn = mockFetch([
      { ok: true, body: { data: { content: "data:image/png;base64,xyz" } } }
    ]);
    const render = createTemplateRenderer({
      apiKey: "test-key",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({ templateId: "t2", modifications: {} })
    ).resolves.toBe("data:image/png;base64,xyz");
  });

  it("returns first page content for carousel response (URL)", async () => {
    const fetchFn = mockFetch([
      {
        ok: true,
        body: {
          data: [
            { page: 1, content: "https://storage.orshot.com/cloud/w-11/renders/images/abc.png" },
            { page: 2, content: "https://storage.orshot.com/cloud/w-11/renders/images/def.png" }
          ],
          type: "url",
          totalPages: 2
        }
      }
    ]);
    const render = createTemplateRenderer({
      apiKey: "test-key",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({ templateId: "carousel-1", modifications: {} })
    ).resolves.toBe("https://storage.orshot.com/cloud/w-11/renders/images/abc.png");
  });

  it("throws when response has no usable content", async () => {
    const fetchFn = mockFetch([
      { ok: true, body: { data: {} } }
    ]);
    const render = createTemplateRenderer({
      apiKey: "test-key",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({ templateId: "t4", modifications: {} })
    ).rejects.toThrow("Orshot render returned an empty image response");
  });

  it("throws on non-ok HTTP response with parsed error detail", async () => {
    const fetchFn = mockFetch([
      {
        ok: false,
        status: 401,
        body: { error: "Invalid API key" }
      }
    ]);
    const render = createTemplateRenderer({
      apiKey: "test-key",
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({ templateId: "t5", modifications: {} })
    ).rejects.toThrow("Orshot render failed: 401 Invalid API key");
  });

  it("uses env api key fallback when deps.apiKey not provided", async () => {
    process.env.ORSHOT_API_KEY = "env-key";
    const fetchFn = mockFetch([
      { ok: true, body: { data: { content: "data:image/png;base64,xyz" } } }
    ]);
    const render = createTemplateRenderer({
      fetchFn: fetchFn as typeof fetch
    });

    await expect(
      render({ templateId: "template-env", modifications: {} })
    ).resolves.toBe("data:image/png;base64,xyz");

    expect(fetchFn).toHaveBeenCalledWith(
      ORSHOT_RENDER_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer env-key"
        })
      })
    );
  });
});
