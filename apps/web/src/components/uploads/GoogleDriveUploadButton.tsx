"use client";

import * as React from "react";
import { toast } from "sonner";
import { LoadingImage } from "../ui/loading-image";
import { Button } from "../ui/button";

type GoogleDriveUploadButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "type" | "onClick"
> & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFilesSelected?: (files: File[]) => void;
  onPickerOpenChange?: (open: boolean) => void;
  accept?: string;
  maxImageBytes?: number;
  compressImages?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onLoadingCountChange?: (count: number) => void;
};

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/bmp",
  "image/x-icon",
  "image/avif"
];

const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-matroska",
  "video/webm",
  "video/ogg",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2"
];

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  mkv: "video/x-matroska",
  webm: "video/webm",
  ogg: "video/ogg",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2"
};

const inferMimeType = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) {
    return "";
  }
  return MIME_BY_EXTENSION[ext] ?? "";
};

const compressImageToTarget = async (
  file: File,
  targetBytes: number
): Promise<File | null> => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    let scale = 1;
    if (file.size > targetBytes) {
      scale = Math.min(1, Math.sqrt(targetBytes / file.size) * 0.95);
    }

    let width = Math.max(1, Math.floor(image.width * scale));
    let height = Math.max(1, Math.floor(image.height * scale));

    const encode = async (quality: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });

    let blob: Blob | null = null;
    let quality = 0.92;
    let attempts = 0;

    while (attempts < 6) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      blob = await encode(quality);

      if (blob && blob.size <= targetBytes) {
        break;
      }

      if (quality > 0.5) {
        quality = Math.max(0.5, quality - 0.15);
      } else {
        width = Math.max(1, Math.floor(width * 0.85));
        height = Math.max(1, Math.floor(height * 0.85));
      }

      attempts += 1;
    }

    if (!blob) {
      return null;
    }

    const nextName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nextName, { type: "image/jpeg" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
};

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

function GoogleDriveUploadButton({
  onClick,
  onFilesSelected,
  onPickerOpenChange,
  accept,
  maxImageBytes,
  compressImages,
  onLoadingChange,
  onLoadingCountChange,
  ...props
}: GoogleDriveUploadButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const tokenClientRef = React.useRef<{
    requestAccessToken: (options?: { prompt?: string }) => void;
  } | null>(null);
  const authTimeoutRef = React.useRef<number | null>(null);
  const pickerMimeTypes = React.useMemo(() => {
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
  }, [accept]);

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
    await loadScript(
      "https://accounts.google.com/gsi/client",
      "google-identity"
    );
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity Services failed to load.");
    }
  }, [loadScript]);

  const downloadDriveFiles = React.useCallback(
    async (docs: GooglePickerDoc[], accessToken: string) => {
      onLoadingChange?.(true);
      onLoadingCountChange?.(docs.length);
      const results = await Promise.allSettled(
        docs.map(async (doc) => {
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
            let errorDetail = "";
            const contentType = response.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              try {
                const payload = await response.json();
                errorDetail =
                  payload?.error?.message ?? payload?.error_description ?? "";
              } catch {
                // Ignore JSON parsing errors.
              }
            }
            const statusLabel = `(${response.status})`;
            const message = errorDetail
              ? `${errorDetail} ${statusLabel}`.trim()
              : `Failed to download ${doc.name ?? "file"} ${statusLabel}`.trim();
            throw new Error(message);
          }
          const blob = await response.blob();
          const name = doc.name ?? `drive-file-${doc.id}`;
          const headerType = response.headers
            .get("content-type")
            ?.split(";")[0]
            .trim();
          const resolvedType =
            doc.mimeType || headerType || blob.type || inferMimeType(name);
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
        })
      );

      const files: File[] = [];
      const failures: string[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          files.push(result.value);
        } else {
          failures.push(result.reason?.message ?? "Download failed.");
        }
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
      onLoadingChange?.(false);
      onLoadingCountChange?.(0);
    },
    [
      compressImages,
      maxImageBytes,
      onFilesSelected,
      onLoadingChange,
      onLoadingCountChange
    ]
  );

  const openPicker = React.useCallback(
    async (accessToken: string) => {
      if (!window.google?.picker) {
        throw new Error("Google Picker is not available.");
      }
      const developerKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY ?? "";
      const appId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID ?? "";
      if (!developerKey) {
        toast.error("Google Drive API key is missing.");
        return;
      }
      if (!appId) {
        toast.error("Google Drive App ID (project number) is missing.");
        return;
      }

      const view = new window.google.picker.View(
        window.google.picker.ViewId.DOCS
      );
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
            setIsLoading(true);
            onLoadingChange?.(true);
            onLoadingCountChange?.(data.docs.length);
            downloadDriveFiles(data.docs, accessToken)
              .catch((error) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to download Drive files."
                );
              })
              .finally(() => {
                setIsLoading(false);
                onLoadingChange?.(false);
                onLoadingCountChange?.(0);
              });
          }
        });

      builder.setAppId(appId);

      const picker = builder.build();
      setIsPickerOpen(true);
      onPickerOpenChange?.(true);
      picker.setVisible(true);
    },
    [
      downloadDriveFiles,
      onPickerOpenChange,
      pickerMimeTypes,
      onLoadingChange,
      onLoadingCountChange
    ]
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(event);
      return;
    }
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ?? "";
    if (!clientId) {
      toast.error("Google Drive client ID is missing.");
      return;
    }

    setIsLoading(true);

    if (authTimeoutRef.current) {
      window.clearTimeout(authTimeoutRef.current);
    }
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
            callback: (response: GoogleTokenResponse) => {
              if (authTimeoutRef.current) {
                window.clearTimeout(authTimeoutRef.current);
                authTimeoutRef.current = null;
              }
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
            }
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
        if (authTimeoutRef.current) {
          window.clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      });
  };

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
      if (authTimeoutRef.current) {
        window.clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
    };
  }, [isPickerOpen]);

  return (
    <Button type="button" onClick={handleClick} disabled={isLoading} {...props}>
      <LoadingImage
        src="/google-drive-icon.png"
        alt="Google Drive"
        width={24}
        height={24}
      />
      Google Drive
    </Button>
  );
}

export { GoogleDriveUploadButton };
