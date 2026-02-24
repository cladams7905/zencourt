export async function signUrlArray(
  urls: string[],
  signer: (url: string) => Promise<string | null | undefined>
): Promise<string[]> {
  const signed = await Promise.all(urls.map((url) => signer(url)));
  return signed.filter((url): url is string => Boolean(url));
}

export async function mapWithSignedUrl<T extends { url: string }>(
  rows: T[],
  signer: (url: string) => Promise<string | null | undefined>,
  {
    fallbackToOriginal = true
  }: {
    fallbackToOriginal?: boolean;
  } = {}
): Promise<T[]> {
  const signedRows = await Promise.all(
    rows.map(async (row) => {
      const signedUrl = await signer(row.url);
      return {
        ...row,
        url: signedUrl ?? (fallbackToOriginal ? row.url : "")
      };
    })
  );

  if (fallbackToOriginal) {
    return signedRows as T[];
  }

  return signedRows.filter((row) => Boolean(row.url)) as T[];
}
