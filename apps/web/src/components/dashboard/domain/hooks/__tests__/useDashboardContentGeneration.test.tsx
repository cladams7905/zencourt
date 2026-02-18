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
});
