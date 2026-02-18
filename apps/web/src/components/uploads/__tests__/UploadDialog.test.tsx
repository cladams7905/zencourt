import * as React from "react";
import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { UploadDialog } from "../UploadDialog";

const toastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    message: jest.fn(),
    success: jest.fn()
  }
}));

jest.mock("../GoogleDriveUploadButton", () => ({
  GoogleDriveUploadButton: () => <button type="button">Google Drive</button>
}));

const createFile = (name: string, type = "image/jpeg") =>
  new File(["file"], name, { type });

const createSizedFile = (name: string, size: number, type = "image/jpeg") => {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
};

const renderDialog = (overrides?: Partial<React.ComponentProps<typeof UploadDialog>>) => {
  const props: React.ComponentProps<typeof UploadDialog> = {
    open: true,
    onOpenChange: jest.fn(),
    title: "Upload",
    description: "Upload files",
    accept: "image/*",
    dropTitle: "Drop",
    dropSubtitle: "Drop subtitle",
    primaryActionLabel: "Upload",
    fileValidator: () => ({ accepted: true }),
    getUploadUrls: async () => ({ uploads: [], failed: [] }),
    buildRecordInput: async ({ upload, file }) => ({
      key: upload.key,
      fileName: file.name,
      publicUrl: upload.publicUrl
    }),
    onCreateRecords: async () => {},
    ...overrides
  };

  return render(<UploadDialog {...props} />);
};

class MockXHR {
  public upload = { onprogress: null as null | ((event: ProgressEvent) => void) };
  public status = 200;
  public timeout = 0;
  public onload: null | (() => void) = null;
  public onerror: null | (() => void) = null;
  public ontimeout: null | (() => void) = null;
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

describe("UploadDialog", () => {
  beforeEach(() => {
    toastError.mockClear();
    // @ts-expect-error - test override
    global.XMLHttpRequest = MockXHR;
  });

  it("enforces maxFiles and shows a toast when exceeded", async () => {
    renderDialog({
      maxFiles: 1,
      fileValidator: () => ({ accepted: true })
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createFile("a.jpg"), createFile("b.jpg")] }
    });

    expect(await screen.findByText("1 file selected")).toBeInTheDocument();
    expect(toastError).toHaveBeenCalled();
  });

  it("marks files as failed when upload URLs are missing", async () => {
    renderDialog({
      getUploadUrls: async () => ({ uploads: [], failed: [] })
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createFile("a.jpg")] }
    });

    await userEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry failed" })).toBeInTheDocument();
    });
  });

  it("continues upload when one record build fails", async () => {
    const onCreateRecords = jest.fn();
    let failedId = "";
    const getUploadUrls = async (requests: { id: string; fileName: string }[]) => {
      failedId = requests[0]?.id ?? "";
      return {
        uploads: requests.map((request, index) => ({
          id: request.id,
          uploadUrl: `https://example.com/${index}`,
          key: request.fileName,
          publicUrl: `https://cdn/${request.fileName}`
        })),
        failed: []
      };
    };

    const buildRecordInput = jest.fn(async ({ upload }: { upload: { id: string } }) => {
      if (upload.id === failedId) {
        throw new Error("boom");
      }
      return {
        key: "b",
        fileName: "b.jpg",
        publicUrl: "https://cdn/b"
      };
    });

    renderDialog({
      getUploadUrls,
      buildRecordInput,
      onCreateRecords
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createFile("a.jpg"), createFile("b.jpg")] }
    });

    await userEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(onCreateRecords).toHaveBeenCalledTimes(1);
    });

    const args = onCreateRecords.mock.calls[0]?.[0] ?? [];
    expect(args).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Retry failed" })).toBeInTheDocument();
  });

  it("rejects files with invalid types via fileValidator", () => {
    renderDialog({
      fileValidator: (file) =>
        file.type === "image/jpeg"
          ? { accepted: true }
          : { accepted: false, error: "Invalid file type" }
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createFile("a.txt", "text/plain")] }
    });

    expect(toastError).toHaveBeenCalledWith("Invalid file type");
    expect(screen.queryByText(/file selected/i)).not.toBeInTheDocument();
  });

  it("rejects oversized files via fileValidator", () => {
    const maxSize = 1024;
    renderDialog({
      fileValidator: (file) =>
        file.size <= maxSize
          ? { accepted: true }
          : { accepted: false, error: "File is too large" }
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createSizedFile("big.jpg", 2048, "image/jpeg")] }
    });

    expect(toastError).toHaveBeenCalledWith("File is too large");
    expect(screen.queryByText(/file selected/i)).not.toBeInTheDocument();
  });

  it("accepts valid files and closes dialog on successful upload", async () => {
    const onCreateRecords = jest.fn();
    const onOpenChange = jest.fn();
    const onSuccess = jest.fn();
    const getUploadUrls = async (requests: { id: string; fileName: string }[]) => ({
      uploads: requests.map((request, index) => ({
        id: request.id,
        uploadUrl: `https://example.com/${index}`,
        key: request.fileName,
        publicUrl: `https://cdn/${request.fileName}`
      })),
      failed: []
    });

    renderDialog({
      getUploadUrls,
      onCreateRecords,
      onOpenChange,
      onSuccess
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createFile("a.jpg"), createFile("b.jpg")] }
    });

    await userEvent.click(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(onCreateRecords).toHaveBeenCalledTimes(1);
    });

    const args = onCreateRecords.mock.calls[0]?.[0] ?? [];
    expect(args).toHaveLength(2);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("keeps valid files when some are rejected", async () => {
    renderDialog({
      fileValidator: (file) =>
        file.type === "image/jpeg"
          ? { accepted: true }
          : { accepted: false, error: "Unsupported type" }
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createFile("a.jpg"), createFile("a.txt", "text/plain")] }
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Unsupported type");
      expect(screen.getByText("1 file selected")).toBeInTheDocument();
    });
  });

  it("ignores duplicate files by name, size, and type", async () => {
    renderDialog({
      fileValidator: () => ({ accepted: true })
    });

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = createFile("dup.jpg");
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("1 file selected")).toBeInTheDocument();
    });
  });
});
