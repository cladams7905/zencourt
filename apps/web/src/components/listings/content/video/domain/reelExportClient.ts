export function clampReelDownloadProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export async function readReelDownloadBlob(
  response: Response,
  onProgress: (progress: number) => void
): Promise<Blob> {
  if (!response.body) {
    return response.blob();
  }

  const reader = response.body.getReader();
  const contentLengthHeader = response.headers.get("content-length");
  const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  const chunks: BlobPart[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    const chunk = new Uint8Array(value.byteLength);
    chunk.set(value);
    chunks.push(chunk);
    receivedBytes += value.byteLength;

    if (Number.isFinite(totalBytes) && totalBytes > 0) {
      onProgress(receivedBytes / totalBytes);
    }
  }

  return new Blob(chunks, {
    type: response.headers.get("content-type") ?? "application/octet-stream"
  });
}
