const mockAnalyzeImagesWorkflow = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@web/src/server/services/imageCategorization", () => ({
  __esModule: true,
  analyzeImagesWorkflow: (...args: unknown[]) =>
    (mockAnalyzeImagesWorkflow as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    info: (...args: unknown[]) => ((mockLoggerInfo as (...a: unknown[]) => unknown)(...args)),
    error: (...args: unknown[]) => ((mockLoggerError as (...a: unknown[]) => unknown)(...args))
  })
}));

import { analyzeImagesWorkflow } from "@web/src/server/actions/api/vision/analyze";

describe("vision analyze action", () => {
  beforeEach(() => {
    mockAnalyzeImagesWorkflow.mockReset();
    mockLoggerInfo.mockReset();
    mockLoggerError.mockReset();
  });

  it("returns analysis result", async () => {
    const result = {
      images: [{ id: "img-1" }],
      stats: { analyzed: 1, failed: 0 }
    };
    mockAnalyzeImagesWorkflow.mockResolvedValueOnce(result);

    await expect(analyzeImagesWorkflow([{ id: "img-1" } as never])).resolves.toEqual(result);
    expect(mockLoggerInfo).toHaveBeenCalled();
  });

  it("wraps processor errors", async () => {
    mockAnalyzeImagesWorkflow.mockRejectedValueOnce(new Error("service down"));

    await expect(analyzeImagesWorkflow([])).rejects.toThrow(
      "Failed to analyze images: service down"
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
