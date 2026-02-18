export const compressImageToTarget = async (
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
