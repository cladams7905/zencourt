import { streamSseEvents } from "@web/src/lib/sse/sseEventStream";
import { streamTemplateRenderEvents } from "../streamEvents";

jest.mock("@web/src/lib/sse/sseEventStream", () => ({
  streamSseEvents: jest.fn()
}));

const mockStreamSseEvents = jest.mocked(streamSseEvents);

describe("templateRenderStreamEvents", () => {
  beforeEach(() => {
    mockStreamSseEvents.mockReset();
  });

  it("yields the underlying SSE stream events unchanged", async () => {
    const reader = { read: jest.fn() };
    mockStreamSseEvents.mockImplementation(async function* () {
      yield { type: "item", item: { templateId: "template-1" } };
      yield { type: "done", failedTemplateIds: ["template-2"] };
    });

    const events = [];
    for await (const event of streamTemplateRenderEvents(reader as never)) {
      events.push(event);
    }

    expect(mockStreamSseEvents).toHaveBeenCalledWith(reader);
    expect(events).toEqual([
      { type: "item", item: { templateId: "template-1" } },
      { type: "done", failedTemplateIds: ["template-2"] }
    ]);
  });
});
