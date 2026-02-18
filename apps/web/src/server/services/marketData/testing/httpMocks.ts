export function createAbortingFetchMock(
  message = "The operation was aborted"
): typeof fetch {
  return (async () => {
    const error = new Error(message);
    (error as Error & { name: string }).name = "AbortError";
    throw error;
  }) as typeof fetch;
}

export function createJsonFetchMock(params: {
  ok?: boolean;
  status?: number;
  json?: unknown;
  text?: string;
}): typeof fetch {
  const { ok = true, status = 200, json = {}, text = "" } = params;

  return (async () =>
    ({
      ok,
      status,
      json: async () => json,
      text: async () => text
    } as Response)) as typeof fetch;
}
