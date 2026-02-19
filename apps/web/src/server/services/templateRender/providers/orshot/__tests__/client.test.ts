import { createTemplateRenderer } from "../client";

describe("templateRender/providers/orshot/client", () => {
  afterEach(() => {
    delete process.env.ORSHOT_API_KEY;
  });

  it("throws when API key is missing", async () => {
    const render = createTemplateRenderer({
      apiKey: " ",
      createClient: () =>
        ({
          renderFromTemplate: jest.fn()
        }) as never
    });

    await expect(
      render({
        templateId: "template-1",
        modifications: {}
      })
    ).rejects.toThrow("ORSHOT_API_KEY must be configured");
  });

  it("renders and normalizes string response to data url", async () => {
    const renderFromTemplate = jest.fn().mockResolvedValue("ZmFrZS1pbWFnZQ==");
    const createClient = jest.fn(() => ({ renderFromTemplate }));
    const render = createTemplateRenderer({
      apiKey: "test-key",
      createClient: createClient as never
    });

    await expect(
      render({
        templateId: "template-1",
        modifications: { headerText: "Hello" }
      })
    ).resolves.toBe("data:image/png;base64,ZmFrZS1pbWFnZQ==");

    expect(createClient).toHaveBeenCalledWith("test-key");
    expect(renderFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "template-1",
        responseType: "base64",
        responseFormat: "png"
      })
    );
  });

  it("accepts response variants and throws on empty payload", async () => {
    const renderFromTemplate = jest
      .fn()
      .mockResolvedValueOnce({ base64: "abc" })
      .mockResolvedValueOnce({ image: "data:image/png;base64,def" })
      .mockResolvedValueOnce({ data: "ghi" })
      .mockResolvedValueOnce({});
    const render = createTemplateRenderer({
      apiKey: "test-key",
      createClient: (() => ({ renderFromTemplate })) as never
    });

    await expect(render({ templateId: "t1", modifications: {} })).resolves.toBe(
      "data:image/png;base64,abc"
    );
    await expect(render({ templateId: "t2", modifications: {} })).resolves.toBe(
      "data:image/png;base64,def"
    );
    await expect(render({ templateId: "t3", modifications: {} })).resolves.toBe(
      "data:image/png;base64,ghi"
    );
    await expect(
      render({ templateId: "t4", modifications: {} })
    ).rejects.toThrow("Orshot render returned an empty image response");
  });

  it("uses env api key fallback and preserves data url responses", async () => {
    process.env.ORSHOT_API_KEY = "env-key";
    const renderFromTemplate = jest
      .fn()
      .mockResolvedValue("  data:image/png;base64,xyz  ");
    const createClient = jest.fn(() => ({ renderFromTemplate }));
    const render = createTemplateRenderer({
      createClient: createClient as never
    });

    await expect(
      render({ templateId: "template-env", modifications: {} })
    ).resolves.toBe("data:image/png;base64,xyz");

    expect(createClient).toHaveBeenCalledWith("env-key");
  });
});
