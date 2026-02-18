import * as React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useDashboardContentGeneration } from "@web/src/components/dashboard/domain/hooks/useDashboardContentGeneration";
import { cloneDefaultGeneratedState } from "@web/src/components/dashboard/domain/dashboardSessionUtils";
import { GENERATED_BATCH_SIZE } from "@web/src/components/dashboard/shared";

const mockRequestStream = jest.fn();
const mockStreamEvents = jest.fn();
const mockExtractJsonItems = jest.fn();

jest.mock("@web/src/components/dashboard/domain/dashboardContentStream", () => ({
  requestDashboardContentStream: (...args: unknown[]) => mockRequestStream(...args),
  streamDashboardContentEvents: (...args: unknown[]) => mockStreamEvents(...args)
}));

jest.mock("@web/src/lib/streamParsing", () => ({
  extractJsonItemsFromStream: (...args: unknown[]) => mockExtractJsonItems(...args)
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn()
  }
}));

function eventsGenerator(events: unknown[]) {
  return (async function* () {
    for (const event of events) {
      yield event;
    }
  })();
}

describe("useDashboardContentGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockRequestStream.mockResolvedValue({} as ReadableStreamDefaultReader<Uint8Array>);
    mockExtractJsonItems.mockReturnValue([]);
  });

  it("handles successful done event", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        {
          type: "done",
          items: [{ hook: "A" }, { hook: "B" }, { hook: "C" }, { hook: "D" }]
        }
      ])
    );

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems,
        headerName: "Alex",
        location: "Austin, TX 78701"
      });
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(result.current.generationError).toBeNull();
    expect(result.current.loadingCount).toBe(0);
    expect(result.current.activeGeneratedItems).toHaveLength(4);
  });

  it("tracks partial batches as retryable", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([{ type: "done", items: [{ hook: "A" }, { hook: "B" }] }])
    );

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems,
        headerName: "Alex"
      });
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(result.current.activeGeneratedItems).toHaveLength(2);
    expect(result.current.loadingCount).toBe(GENERATED_BATCH_SIZE - 2);
    expect(result.current.generationError).toBe("sorry, an error occurred. Please retry.");
    expect(toast.error).toHaveBeenCalledWith("Sorry, an error occurred. Please retry.");
  });

  it("reports missing done event as retryable error", async () => {
    mockStreamEvents.mockReturnValue(eventsGenerator([]));

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems,
        headerName: "Alex"
      });
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(result.current.generationError).toBe("sorry, an error occurred. Please retry.");
    expect(result.current.loadingCount).toBe(GENERATED_BATCH_SIZE);
  });

  it("auto-generates when filter is selected and no content exists", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([{ type: "done", items: [{ hook: "A" }, { hook: "B" }, { hook: "C" }, { hook: "D" }] }])
    );

    renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: true,
        generatedContentItems,
        setGeneratedContentItems,
        headerName: "Alex"
      });
    });

    await waitFor(() => {
      expect(mockRequestStream).toHaveBeenCalledTimes(1);
    });
  });

  it("handles abort errors without retry toast", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mockRequestStream.mockRejectedValue(abortError);

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems,
        headerName: "Alex"
      });
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(result.current.generationError).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("handles delta stream updates before done", async () => {
    mockExtractJsonItems
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ hook: "Delta hook", caption: "Delta caption" }]);
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        { type: "delta", text: "[" },
        { type: "delta", text: '{"hook":"Delta hook"}' },
        { type: "done", items: [{ hook: "Final hook" }, { hook: "B" }, { hook: "C" }, { hook: "D" }] }
      ])
    );

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems
      });
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(mockExtractJsonItems).toHaveBeenCalled();
    expect(result.current.activeGeneratedItems).toHaveLength(4);
    expect(result.current.activeGeneratedItems[0]?.hook).toBe("Final hook");
  });

  it("handles explicit stream error events", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([{ type: "error", message: "stream failed" }])
    );

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems
      });
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(result.current.generationError).toBe("sorry, an error occurred. Please retry.");
    expect(toast.error).toHaveBeenCalledWith("Sorry, an error occurred. Please retry.");
    expect(result.current.activeGeneratedItems).toHaveLength(0);
  });

  it("does not auto-generate when active category already has content", async () => {
    const preloaded = cloneDefaultGeneratedState();
    preloaded.videos.market_insights = [{ id: "generated-1", hook: "Existing" }];

    renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(preloaded);
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: true,
        generatedContentItems,
        setGeneratedContentItems
      });
    });

    await waitFor(() => {
      expect(mockRequestStream).not.toHaveBeenCalled();
    });
  });

  it("does not auto-generate without selected filter or category", async () => {
    renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: null,
        activeCategory: null,
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems
      });
    });

    await waitFor(() => {
      expect(mockRequestStream).not.toHaveBeenCalled();
    });
  });

  it("aborts an in-flight generation when a new one starts", async () => {
    jest.useFakeTimers();

    const firstSignalRef: { current: AbortSignal | null } = { current: null };
    mockRequestStream
      .mockImplementationOnce(async ({ signal }: { signal: AbortSignal }) => {
        firstSignalRef.current = signal;
        return new Promise<ReadableStreamDefaultReader<Uint8Array>>((_, reject) => {
          signal.addEventListener("abort", () => {
            const abortError = new Error("aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      })
      .mockResolvedValue({} as ReadableStreamDefaultReader<Uint8Array>);
    mockStreamEvents.mockReturnValue(
      eventsGenerator([{ type: "done", items: [{ hook: "A" }, { hook: "B" }, { hook: "C" }, { hook: "D" }] }])
    );

    const { result } = renderHook(() => {
      const [generatedContentItems, setGeneratedContentItems] = React.useState(
        cloneDefaultGeneratedState()
      );
      return useDashboardContentGeneration({
        contentType: "videos",
        activeFilter: "Market Insights",
        activeCategory: "market_insights",
        hasSelectedFilter: false,
        generatedContentItems,
        setGeneratedContentItems
      });
    });

    act(() => {
      void result.current.generateContent("market_insights");
    });

    await waitFor(() => {
      expect(firstSignalRef.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.generateContent("market_insights");
    });

    expect(firstSignalRef.current?.aborted).toBe(true);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.isGenerating).toBe(false);
  });
});
