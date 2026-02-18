import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useUploadDialogState } from "@web/src/components/uploads/domain/hooks/useUploadDialogState";
import {
  compressImageToTarget,
  createVideoThumbnailBlob
} from "@web/src/components/uploads/domain/services";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn()
  }
}));

jest.mock("@web/src/components/uploads/domain/services", () => ({
  compressImageToTarget: jest.fn(),
  createVideoThumbnailBlob: jest.fn()
}));

class MockXHR {
  upload = { onprogress: null as null | ((event: ProgressEvent) => void) };
  status = 200;
  timeout = 0;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  ontimeout: null | (() => void) = null;
  open = jest.fn();
  setRequestHeader = jest.fn();
  send = jest.fn(() => {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 1,
      total: 1
    } as ProgressEvent);
    this.onload?.();
  });
}

describe("useUploadDialogState", () => {
  const originalXhr = global.XMLHttpRequest;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  const buildArgs = () => ({
    open: true,
    onOpenChange: jest.fn(),
    selectedLabel: "file",
    fileValidator: jest.fn(() => ({ accepted: true })),
    getUploadUrls: jest.fn(
      async (requests: { id: string; fileName: string; fileType: string }[]) => ({
        uploads: requests.map((request, index) => ({
          id: request.id,
          uploadUrl: `https://example.com/${index}`,
          key: request.fileName,
          type: request.fileType,
          publicUrl: `https://cdn/${request.fileName}`
        })),
        failed: []
      })
    ),
    buildRecordInput: jest.fn(async ({ upload, file }: { upload: { key: string }; file: File }) => ({
      key: upload.key,
      fileName: file.name
    })),
    onCreateRecords: jest.fn(async () => undefined),
    onSuccess: jest.fn(),
    onUploadsComplete: jest.fn(),
    thumbnailFailureMessage: (count: number) => `${count} thumbnail(s) failed`
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;
    URL.createObjectURL = jest
      .fn()
      .mockImplementation(() => `blob:${Math.random().toString(16).slice(2)}`);
    URL.revokeObjectURL = jest.fn();
    (compressImageToTarget as jest.Mock).mockResolvedValue(null);
    (createVideoThumbnailBlob as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    global.XMLHttpRequest = originalXhr;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("adds files up to maxFiles and rejects duplicates", async () => {
    const args = buildArgs();
    const { result } = renderHook(() =>
      useUploadDialogState({
        ...args,
        maxFiles: 1
      })
    );

    const fileA = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const fileB = new File(["b"], "b.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.addFiles([fileA, fileB]);
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith("Only 1 more file(s) allowed.");

    await act(async () => {
      await result.current.addFiles([fileA]);
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith(
      "You can only upload up to 1 files."
    );
  });

  it("compresses oversized images before validation", async () => {
    const args = buildArgs();
    const compressed = new File(["compressed"], "large.jpg", {
      type: "image/jpeg"
    });
    (compressImageToTarget as jest.Mock).mockResolvedValue(compressed);

    const { result } = renderHook(() =>
      useUploadDialogState({
        ...args,
        maxImageBytes: 4,
        compressOversizeImages: true
      })
    );

    const oversized = new File([new Uint8Array(100)], "large.png", {
      type: "image/png"
    });

    await act(async () => {
      await result.current.addFiles([oversized]);
    });

    expect(compressImageToTarget).toHaveBeenCalledTimes(1);
    expect(result.current.pendingFiles[0]?.file.name).toBe("large.jpg");
  });

  it("uploads successfully and calls completion callbacks", async () => {
    const args = buildArgs();
    const { result } = renderHook(() => useUploadDialogState(args));

    const file = new File(["a"], "a.jpg", { type: "image/jpeg" });
    await act(async () => {
      await result.current.addFiles([file]);
    });

    await act(async () => {
      await result.current.handleUpload();
    });

    await waitFor(() => {
      expect(args.onCreateRecords).toHaveBeenCalledTimes(1);
      expect(args.onOpenChange).toHaveBeenCalledWith(false);
      expect(args.onSuccess).toHaveBeenCalledTimes(1);
      expect(args.onUploadsComplete).toHaveBeenCalledTimes(1);
      expect(result.current.pendingFiles).toHaveLength(0);
    });
  });

  it("keeps failed uploads when record preparation throws", async () => {
    const args = buildArgs();
    args.buildRecordInput = (jest.fn(async () => {
      throw new Error("Failed to prepare upload record.");
    }) as unknown) as typeof args.buildRecordInput;

    const { result } = renderHook(() => useUploadDialogState(args));
    const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.addFiles([file]);
    });

    await act(async () => {
      await result.current.handleUpload();
    });

    await waitFor(() => {
      expect(result.current.pendingFiles).toHaveLength(1);
      expect(result.current.pendingFiles[0]?.status).toBe("error");
      expect(args.onCreateRecords).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Failed to prepare upload record.");
    });
  });

  it("removes a pending file and revokes its preview URL", async () => {
    const args = buildArgs();
    const { result } = renderHook(() => useUploadDialogState(args));
    const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.addFiles([file]);
    });

    const id = result.current.pendingFiles[0]?.id;
    expect(id).toBeDefined();

    act(() => {
      result.current.removePendingFile(id!);
    });

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
