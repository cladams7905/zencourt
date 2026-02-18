/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useGoogleDrivePicker } from "@web/src/components/uploads/domain/hooks/useGoogleDrivePicker";
import { compressImageToTarget } from "@web/src/components/uploads/domain/services";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn()
  }
}));

jest.mock("@web/src/components/uploads/domain/services", () => ({
  compressImageToTarget: jest.fn()
}));

describe("useGoogleDrivePicker", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const originalGoogle = window.google;
  const originalGapi = window.gapi;

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    window.google = originalGoogle;
    window.gapi = originalGapi;
    (compressImageToTarget as jest.Mock).mockReset();
    jest.restoreAllMocks();
  });

  it("shows error when google drive client id is missing", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;

    const { result } = renderHook(() => useGoogleDrivePicker({}));
    act(() => {
      result.current.openFromButton();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Google Drive client ID is missing."
    );
  });

  it("downloads selected files and calls onFilesSelected", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID = "client-id";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY = "api-key";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = "app-id";

    const identityScript = document.createElement("script");
    identityScript.id = "google-identity";
    identityScript.dataset.loaded = "true";
    const apiScript = document.createElement("script");
    apiScript.id = "google-api";
    apiScript.dataset.loaded = "true";
    document.head.appendChild(identityScript);
    document.head.appendChild(apiScript);

    let pickerCallback:
      | ((data: {
          action?: string;
          docs?: { id?: string; name?: string; mimeType?: string }[];
        }) => void)
      | null = null;

    const pickerBuilder = {
      addView: jest.fn().mockReturnThis(),
      enableFeature: jest.fn().mockReturnThis(),
      setOAuthToken: jest.fn().mockReturnThis(),
      setDeveloperKey: jest.fn().mockReturnThis(),
      setAppId: jest.fn().mockReturnThis(),
      setCallback: jest.fn().mockImplementation((cb) => {
        pickerCallback = cb;
        return pickerBuilder;
      }),
      build: jest.fn(() => ({ setVisible: jest.fn() }))
    };

    const viewSetMimeTypes = jest.fn();

    window.gapi = {
      load: (_name, options) => options.callback()
    };
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback
          }: {
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => ({
            requestAccessToken: () => callback({ access_token: "token" })
          })
        }
      },
      picker: {
        Action: { LOADED: "LOADED", PICKED: "PICKED", CANCEL: "CANCEL" },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED" },
        ViewId: { DOCS: "DOCS" },
        View: function () {
          return {
            setMimeTypes: viewSetMimeTypes
          };
        } as unknown as new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
        },
        PickerBuilder: function () {
          return pickerBuilder;
        } as unknown as new () => typeof pickerBuilder
      }
    } as unknown as Window["google"];

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: {
        get: () => "image/jpeg"
      },
      blob: async () => new Blob(["img"], { type: "image/jpeg" })
    })) as unknown as typeof fetch;

    const onFilesSelected = jest.fn();
    const onPickerOpenChange = jest.fn();
    const { result } = renderHook(() =>
      useGoogleDrivePicker({
        onFilesSelected,
        onPickerOpenChange,
        accept: "video/*,application/pdf"
      })
    );

    await act(async () => {
      result.current.openFromButton();
    });

    await waitFor(() => {
      expect(onPickerOpenChange).toHaveBeenCalledWith(true);
      expect(viewSetMimeTypes).toHaveBeenCalled();
      expect(pickerCallback).not.toBeNull();
    });

    await act(async () => {
      pickerCallback?.({
        action: "PICKED",
        docs: [{ id: "file-1", name: "a.jpg", mimeType: "image/jpeg" }]
      });
    });

    await waitFor(() => {
      expect(onFilesSelected).toHaveBeenCalledTimes(1);
      const files = onFilesSelected.mock.calls[0]?.[0] as File[];
      expect(files).toHaveLength(1);
      expect(files[0]?.name).toBe("a.jpg");
    });

    identityScript.remove();
    apiScript.remove();
  });

  it("shows error when API key is missing", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID = "client-id";
    delete process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = "app-id";

    const identityScript = document.createElement("script");
    identityScript.id = "google-identity";
    identityScript.dataset.loaded = "true";
    const apiScript = document.createElement("script");
    apiScript.id = "google-api";
    apiScript.dataset.loaded = "true";
    document.head.appendChild(identityScript);
    document.head.appendChild(apiScript);

    window.gapi = {
      load: (_name, options) => options.callback()
    };
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback
          }: {
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => ({
            requestAccessToken: () => callback({ access_token: "token" })
          })
        }
      },
      picker: {
        Action: { LOADED: "LOADED", PICKED: "PICKED", CANCEL: "CANCEL" },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED" },
        ViewId: { DOCS: "DOCS" },
        View: function () {
          return {
            setMimeTypes: jest.fn()
          };
        } as unknown as new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
        },
        PickerBuilder: function () {
          return {
            addView: jest.fn().mockReturnThis(),
            enableFeature: jest.fn().mockReturnThis(),
            setOAuthToken: jest.fn().mockReturnThis(),
            setDeveloperKey: jest.fn().mockReturnThis(),
            setAppId: jest.fn().mockReturnThis(),
            setCallback: jest.fn().mockReturnThis(),
            build: jest.fn(() => ({ setVisible: jest.fn() }))
          };
        } as unknown as new () => {
          addView: () => unknown;
          enableFeature: () => unknown;
          setOAuthToken: () => unknown;
          setDeveloperKey: () => unknown;
          setAppId: () => unknown;
          setCallback: () => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        }
      }
    } as unknown as Window["google"];

    const { result } = renderHook(() => useGoogleDrivePicker({}));
    act(() => {
      result.current.openFromButton();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Google Drive API key is missing."
      );
    });

    identityScript.remove();
    apiScript.remove();
  });

  it("shows authorization error from token client", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID = "client-id";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY = "api-key";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = "app-id";

    const identityScript = document.createElement("script");
    identityScript.id = "google-identity";
    identityScript.dataset.loaded = "true";
    const apiScript = document.createElement("script");
    apiScript.id = "google-api";
    apiScript.dataset.loaded = "true";
    document.head.appendChild(identityScript);
    document.head.appendChild(apiScript);

    window.gapi = {
      load: (_name, options) => options.callback()
    };
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback
          }: {
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => ({
            requestAccessToken: () => callback({ error: "access_denied" })
          })
        }
      },
      picker: {
        Action: { LOADED: "LOADED", PICKED: "PICKED", CANCEL: "CANCEL" },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED" },
        ViewId: { DOCS: "DOCS" },
        View: function () {
          return {
            setMimeTypes: jest.fn()
          };
        } as unknown as new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
        },
        PickerBuilder: function () {
          return {
            addView: jest.fn().mockReturnThis(),
            enableFeature: jest.fn().mockReturnThis(),
            setOAuthToken: jest.fn().mockReturnThis(),
            setDeveloperKey: jest.fn().mockReturnThis(),
            setAppId: jest.fn().mockReturnThis(),
            setCallback: jest.fn().mockReturnThis(),
            build: jest.fn(() => ({ setVisible: jest.fn() }))
          };
        } as unknown as new () => {
          addView: () => unknown;
          enableFeature: () => unknown;
          setOAuthToken: () => unknown;
          setDeveloperKey: () => unknown;
          setAppId: () => unknown;
          setCallback: () => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        }
      }
    } as unknown as Window["google"];

    const onPickerOpenChange = jest.fn();
    const { result } = renderHook(() =>
      useGoogleDrivePicker({ onPickerOpenChange })
    );
    act(() => {
      result.current.openFromButton();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Google Drive authorization failed."
      );
      expect(onPickerOpenChange).toHaveBeenCalledWith(false);
    });

    identityScript.remove();
    apiScript.remove();
  });

  it("shows error when access token is missing", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID = "client-id";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY = "api-key";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = "app-id";

    const identityScript = document.createElement("script");
    identityScript.id = "google-identity";
    identityScript.dataset.loaded = "true";
    const apiScript = document.createElement("script");
    apiScript.id = "google-api";
    apiScript.dataset.loaded = "true";
    document.head.appendChild(identityScript);
    document.head.appendChild(apiScript);

    window.gapi = {
      load: (_name, options) => options.callback()
    };
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback
          }: {
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => ({
            requestAccessToken: () => callback({})
          })
        }
      },
      picker: {
        Action: { LOADED: "LOADED", PICKED: "PICKED", CANCEL: "CANCEL" },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED" },
        ViewId: { DOCS: "DOCS" },
        View: function () {
          return {
            setMimeTypes: jest.fn()
          };
        } as unknown as new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
        },
        PickerBuilder: function () {
          return {
            addView: jest.fn().mockReturnThis(),
            enableFeature: jest.fn().mockReturnThis(),
            setOAuthToken: jest.fn().mockReturnThis(),
            setDeveloperKey: jest.fn().mockReturnThis(),
            setAppId: jest.fn().mockReturnThis(),
            setCallback: jest.fn().mockReturnThis(),
            build: jest.fn(() => ({ setVisible: jest.fn() }))
          };
        } as unknown as new () => {
          addView: () => unknown;
          enableFeature: () => unknown;
          setOAuthToken: () => unknown;
          setDeveloperKey: () => unknown;
          setAppId: () => unknown;
          setCallback: () => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        }
      }
    } as unknown as Window["google"];

    const { result } = renderHook(() => useGoogleDrivePicker({}));
    act(() => {
      result.current.openFromButton();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Missing Google Drive access token."
      );
    });

    identityScript.remove();
    apiScript.remove();
  });

  it("reports drive download errors", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID = "client-id";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY = "api-key";
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID = "app-id";

    const identityScript = document.createElement("script");
    identityScript.id = "google-identity";
    identityScript.dataset.loaded = "true";
    const apiScript = document.createElement("script");
    apiScript.id = "google-api";
    apiScript.dataset.loaded = "true";
    document.head.appendChild(identityScript);
    document.head.appendChild(apiScript);

    let pickerCallback:
      | ((data: {
          action?: string;
          docs?: { id?: string; name?: string; mimeType?: string }[];
        }) => void)
      | null = null;
    const pickerBuilder = {
      addView: jest.fn().mockReturnThis(),
      enableFeature: jest.fn().mockReturnThis(),
      setOAuthToken: jest.fn().mockReturnThis(),
      setDeveloperKey: jest.fn().mockReturnThis(),
      setAppId: jest.fn().mockReturnThis(),
      setCallback: jest.fn().mockImplementation((cb) => {
        pickerCallback = cb;
        return pickerBuilder;
      }),
      build: jest.fn(() => ({ setVisible: jest.fn() }))
    };

    window.gapi = {
      load: (_name, options) => options.callback()
    };
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: ({
            callback
          }: {
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => ({
            requestAccessToken: () => callback({ access_token: "token" })
          })
        }
      },
      picker: {
        Action: { LOADED: "LOADED", PICKED: "PICKED", CANCEL: "CANCEL" },
        Feature: { MULTISELECT_ENABLED: "MULTISELECT_ENABLED" },
        ViewId: { DOCS: "DOCS" },
        View: function () {
          return {
            setMimeTypes: jest.fn()
          };
        } as unknown as new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
        },
        PickerBuilder: function () {
          return pickerBuilder;
        } as unknown as new () => typeof pickerBuilder
      }
    } as unknown as Window["google"];

    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      headers: { get: () => "application/json" },
      json: async () => ({
        error: {
          message: "Permission denied"
        }
      }),
      blob: async () => new Blob()
    })) as unknown as typeof fetch;

    const { result } = renderHook(() => useGoogleDrivePicker({}));
    act(() => {
      result.current.openFromButton();
    });

    await waitFor(() => {
      expect(pickerCallback).not.toBeNull();
    });

    await act(async () => {
      pickerCallback?.({
        action: "PICKED",
        docs: [{ id: "file-1", name: "a.jpg", mimeType: "image/jpeg" }]
      });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Permission denied (403)");
    });

    identityScript.remove();
    apiScript.remove();
  });
});
