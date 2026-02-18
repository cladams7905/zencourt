import * as React from "react";
import { toast } from "sonner";
import { compressImageToTarget } from "@web/src/components/uploads/domain/services";
import {
  IMAGE_MIME_TYPES,
  inferMimeType,
  VIDEO_MIME_TYPES
} from "@web/src/components/uploads/shared";

type GooglePickerDoc = {
  id?: string;
  name?: string;
  mimeType?: string;
};

type GooglePickerResponse = {
  action?: string;
  docs?: GooglePickerDoc[];
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GooglePickerView = {
  setMimeTypes: (mimeTypes: string) => void;
};

type GooglePickerBuilderInstance = {
  addView: (view: GooglePickerView) => GooglePickerBuilderInstance;
  enableFeature: (feature: string) => GooglePickerBuilderInstance;
  setOAuthToken: (token: string) => GooglePickerBuilderInstance;
  setDeveloperKey: (key: string) => GooglePickerBuilderInstance;
  setAppId: (appId: string) => GooglePickerBuilderInstance;
  setCallback: (
    callback: (data: GooglePickerResponse) => void
  ) => GooglePickerBuilderInstance;
  build: () => { setVisible: (visible: boolean) => void };
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void }) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
      picker?: {
        Action: { LOADED: string; PICKED: string; CANCEL: string };
        Feature: { MULTISELECT_ENABLED: string };
        ViewId: { DOCS: string };
        View: new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => void;
        };
        PickerBuilder: new () => GooglePickerBuilderInstance;
      };
    };
  }
}

interface UseGoogleDrivePickerArgs {
  onFilesSelected?: (files: File[]) => void;
  onPickerOpenChange?: (open: boolean) => void;
  accept?: string;
  maxImageBytes?: number;
  compressImages?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onLoadingCountChange?: (count: number) => void;
}

const resolvePickerMimeTypes = (accept?: string) => {
  if (!accept) {
    return [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",");
  }

  const tokens = accept
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const types = new Set<string>();
  tokens.forEach((token) => {
    if (token === "image/*") {
      IMAGE_MIME_TYPES.forEach((type) => types.add(type));
      return;
    }
    if (token === "video/*") {
      VIDEO_MIME_TYPES.forEach((type) => types.add(type));
      return;
    }
    if (token.includes("/")) {
      types.add(token);
    }
  });

  return Array.from(types).join(",");
};

const buildDownloadFailureMessage = async (
  response: Response,
  fileName?: string
) => {
  let errorDetail = "";
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();
      errorDetail = payload?.error?.message ?? payload?.error_description ?? "";
    } catch {
      // Ignore JSON parsing errors.
    }
  }

  const statusLabel = `(${response.status})`;
  if (errorDetail) {
    return `${errorDetail} ${statusLabel}`.trim();
  }

  return `Failed to download ${fileName ?? "file"} ${statusLabel}`.trim();
};

const resolveDriveFileType = (args: {
  docMimeType?: string;
  responseContentType?: string | null;
  blobType?: string;
  fileName: string;
}) => {
  const normalizedHeaderType = args.responseContentType?.split(";")[0].trim();
  return (
    args.docMimeType ||
    normalizedHeaderType ||
    args.blobType ||
    inferMimeType(args.fileName)
  );
};

export const useGoogleDrivePicker = ({
  onFilesSelected,
  onPickerOpenChange,
  accept,
  maxImageBytes,
  compressImages,
  onLoadingChange,
  onLoadingCountChange
}: UseGoogleDrivePickerArgs) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const tokenClientRef = React.useRef<{
    requestAccessToken: (options?: { prompt?: string }) => void;
  } | null>(null);
  const authTimeoutRef = React.useRef<number | null>(null);

  const pickerMimeTypes = React.useMemo(() => resolvePickerMimeTypes(accept), [accept]);

  const setExternalLoadingState = React.useCallback(
    (loading: boolean, count: number) => {
      onLoadingChange?.(loading);
      onLoadingCountChange?.(count);
    },
    [onLoadingChange, onLoadingCountChange]
  );

  const clearAuthTimeout = React.useCallback(() => {
    if (authTimeoutRef.current) {
      window.clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
  }, []);

  const loadScript = React.useCallback((src: string, id: string) => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Window is not available."));
    }

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error(`Failed to load ${src}`))
        );
      });
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.id = id;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }, []);

  const loadPickerLibrary = React.useCallback(async () => {
    await loadScript("https://apis.google.com/js/api.js", "google-api");
    if (!window.gapi) {
      throw new Error("Google API failed to load.");
    }

    await new Promise<void>((resolve) => {
      window.gapi?.load("picker", { callback: resolve });
    });
  }, [loadScript]);

  const loadIdentityServices = React.useCallback(async () => {
    await loadScript("https://accounts.google.com/gsi/client", "google-identity");
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity Services failed to load.");
    }
  }, [loadScript]);

  const downloadDriveFile = React.useCallback(
    async (doc: GooglePickerDoc, accessToken: string) => {
      if (!doc.id) {
        throw new Error("Missing Drive file id.");
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media&supportsAllDrives=true`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(await buildDownloadFailureMessage(response, doc.name));
      }

      const blob = await response.blob();
      const name = doc.name ?? `drive-file-${doc.id}`;
      const resolvedType = resolveDriveFileType({
        docMimeType: doc.mimeType,
        responseContentType: response.headers.get("content-type"),
        blobType: blob.type,
        fileName: name
      });

      let file = new File([blob], name, { type: resolvedType });

      if (
        compressImages &&
        maxImageBytes &&
        file.type.startsWith("image/") &&
        file.size > maxImageBytes
      ) {
        const compressed = await compressImageToTarget(file, maxImageBytes);
        if (compressed) {
          file = compressed;
        } else {
          toast.error(`Unable to compress "${file.name}".`);
        }
      }

      return file;
    },
    [compressImages, maxImageBytes]
  );

  const downloadDriveFiles = React.useCallback(
    async (docs: GooglePickerDoc[], accessToken: string) => {
      setExternalLoadingState(true, docs.length);

      const results = await Promise.allSettled(
        docs.map((doc) => downloadDriveFile(doc, accessToken))
      );

      const files: File[] = [];
      const failures: string[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          files.push(result.value);
          return;
        }
        failures.push(result.reason?.message ?? "Download failed.");
      });

      if (failures.length > 0) {
        toast.error(
          failures.length === 1
            ? failures[0]
            : `Failed to download ${failures.length} file(s).`
        );
      }

      if (files.length > 0) {
        onFilesSelected?.(files);
      }

      setExternalLoadingState(false, 0);
    },
    [downloadDriveFile, onFilesSelected, setExternalLoadingState]
  );

  const handlePickerSelection = React.useCallback(
    (docs: GooglePickerDoc[], accessToken: string) => {
      setIsLoading(true);
      setExternalLoadingState(true, docs.length);

      downloadDriveFiles(docs, accessToken)
        .catch((error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to download Drive files."
          );
        })
        .finally(() => {
          setIsLoading(false);
          setExternalLoadingState(false, 0);
        });
    },
    [downloadDriveFiles, setExternalLoadingState]
  );

  const openPicker = React.useCallback(
    async (accessToken: string) => {
      if (!window.google?.picker) {
        throw new Error("Google Picker is not available.");
      }

      const developerKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY ?? "";
      if (!developerKey) {
        toast.error("Google Drive API key is missing.");
        return;
      }

      const appId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID ?? "";
      if (!appId) {
        toast.error("Google Drive App ID (project number) is missing.");
        return;
      }

      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      if (pickerMimeTypes) {
        view.setMimeTypes(pickerMimeTypes);
      }

      const builder = new window.google.picker.PickerBuilder()
        .addView(view)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .setDeveloperKey(developerKey)
        .setCallback((data: GooglePickerResponse) => {
          const action = data.action;
          const isTerminal =
            action === window.google?.picker?.Action.PICKED ||
            action === window.google?.picker?.Action.CANCEL;

          if (isTerminal) {
            setIsPickerOpen(false);
            onPickerOpenChange?.(false);
          }

          if (action === window.google?.picker?.Action.PICKED && data.docs) {
            handlePickerSelection(data.docs, accessToken);
          }
        });

      builder.setAppId(appId);

      const picker = builder.build();
      setIsPickerOpen(true);
      onPickerOpenChange?.(true);
      picker.setVisible(true);
    },
    [handlePickerSelection, onPickerOpenChange, pickerMimeTypes]
  );

  const handleTokenResponse = React.useCallback(
    (response: GoogleTokenResponse) => {
      clearAuthTimeout();

      if (response.error) {
        toast.error("Google Drive authorization failed.");
        setIsLoading(false);
        setIsPickerOpen(false);
        onPickerOpenChange?.(false);
        return;
      }

      const token = response.access_token;
      if (!token) {
        toast.error("Missing Google Drive access token.");
        setIsLoading(false);
        setIsPickerOpen(false);
        onPickerOpenChange?.(false);
        return;
      }

      openPicker(token)
        .catch((error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to open Google Drive picker."
          );
        })
        .finally(() => setIsLoading(false));
    },
    [clearAuthTimeout, onPickerOpenChange, openPicker]
  );

  const openFromButton = React.useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ?? "";
    if (!clientId) {
      toast.error("Google Drive client ID is missing.");
      return;
    }

    setIsLoading(true);
    clearAuthTimeout();

    authTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setIsPickerOpen(false);
      onPickerOpenChange?.(false);
      toast.error("Google Drive authorization was not completed.");
    }, 12000);

    Promise.all([loadIdentityServices(), loadPickerLibrary()])
      .then(() => {
        const tokenClient =
          tokenClientRef.current ??
          window.google?.accounts?.oauth2?.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive.file",
            callback: handleTokenResponse
          });

        if (!tokenClient) {
          throw new Error("Google OAuth client could not be created.");
        }

        tokenClientRef.current = tokenClient;
        tokenClient.requestAccessToken();
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to initialize Google Drive."
        );
        setIsLoading(false);
        setIsPickerOpen(false);
        onPickerOpenChange?.(false);
        clearAuthTimeout();
      });
  }, [
    clearAuthTimeout,
    handleTokenResponse,
    loadIdentityServices,
    loadPickerLibrary,
    onPickerOpenChange
  ]);

  React.useEffect(() => {
    const handleFocus = () => {
      if (!isPickerOpen) {
        setIsLoading(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPickerOpen(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearAuthTimeout();
    };
  }, [clearAuthTimeout, isPickerOpen]);

  return {
    isLoading,
    openFromButton
  };
};
