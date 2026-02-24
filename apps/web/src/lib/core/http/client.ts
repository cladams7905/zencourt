export class ClientHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientHttpError";
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  fallbackMessage?: string
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const status = typeof response.status === "number" ? response.status : 0;
    let message = fallbackMessage ?? `Request failed (${status || "unknown"})`;
    try {
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      message = payload?.message || payload?.error || message;
    } catch {
      // Ignore non-JSON error payloads.
    }
    throw new ClientHttpError(message, status);
  }

  return response.json() as Promise<T>;
}

export async function fetchApiData<T>(
  url: string,
  init?: RequestInit,
  fallbackMessage?: string
): Promise<T> {
  const payload = await fetchJson<ApiEnvelope<T>>(url, init, fallbackMessage);
  return payload?.data as T;
}

export async function fetchStreamResponse(
  url: string,
  init?: RequestInit,
  fallbackMessage?: string
): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const status = typeof response.status === "number" ? response.status : 0;
    let message = fallbackMessage ?? `Request failed (${status || "unknown"})`;
    try {
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      message = payload?.message || payload?.error || message;
    } catch {
      // Ignore non-JSON error payloads.
    }
    throw new ClientHttpError(message, status);
  }

  return response;
}
