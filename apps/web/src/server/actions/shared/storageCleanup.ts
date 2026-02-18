import storageService from "@web/src/server/services/storage";

export async function deleteStorageUrlsOrThrow(
  urls: Array<string | null | undefined>,
  fallbackMessage: string
): Promise<void> {
  const filtered = urls.filter((url): url is string => Boolean(url));

  for (const url of filtered) {
    const result = await storageService.deleteFile(url);
    if (!result.success) {
      throw new Error(result.error || fallbackMessage);
    }
  }
}
