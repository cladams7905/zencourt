export const createVideoThumbnailBlob = (
  file: File
): Promise<Blob | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let timeoutId: number | undefined = undefined;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };

    const handleError = () => {
      cleanup();
      resolve(null);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadedmetadata = () => {
      const seekTime = Math.min(0.1, video.duration || 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const maxWidth = 480;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        handleError();
        return;
      }
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve(blob);
        },
        "image/jpeg",
        0.7
      );
    };

    video.onerror = handleError;
    timeoutId = window.setTimeout(handleError, 4000);
  });
