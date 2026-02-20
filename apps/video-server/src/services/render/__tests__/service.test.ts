jest.mock("@/services/render/providers/remotion", () => ({
  remotionProvider: {
    renderListingVideo: jest.fn()
  }
}));

const createRenderQueueMock = jest.fn().mockReturnValue({
  getJob: jest.fn(),
  cancelJob: jest.fn(),
  createJob: jest.fn()
});

jest.mock("@/services/render/queue", () => ({
  createRenderQueue: (...args: unknown[]) => createRenderQueueMock(...args)
}));

describe("render service module wiring", () => {
  beforeEach(() => {
    jest.resetModules();
    createRenderQueueMock.mockClear();
  });

  it("creates queue with configured provider and exports facade", async () => {
    const mod = await import("@/services/render/service");

    expect(createRenderQueueMock).toHaveBeenCalledTimes(1);
    expect(createRenderQueueMock).toHaveBeenCalledWith(mod.renderProvider);
    expect(mod.renderServiceFacade.queue).toBe(mod.renderQueue);
    expect(mod.renderServiceFacade.provider).toBe(mod.renderProvider);
  });
});
