const nextFn = jest.fn(() => ({
  status: 200,
  headers: {
    get: jest.fn(() => null)
  }
}));
const redirectFn = jest.fn((url: URL) => ({
  status: 307,
  headers: {
    get: (key: string) => (key.toLowerCase() === "location" ? url.toString() : null)
  }
}));

jest.mock("next/server", () => ({
  NextResponse: {
    next: () => nextFn(),
    redirect: (url: URL) => redirectFn(url)
  }
}));

import { proxy } from "@web/src/proxy";

type CookieMap = Record<string, string>;

function makeRequest(pathname: string, cookies: CookieMap = {}) {
  return {
    nextUrl: { pathname },
    url: `http://localhost${pathname}`,
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value ? { value } : undefined;
      }
    }
  };
}

describe("proxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, "URL", {
      writable: true,
      value: NodeURL
    });
  });

  it("allows public auth and legal routes without session", async () => {
    const publicPaths = [
      "/",
      "/terms",
      "/privacy",
      "/check-inbox",
      "/verify-email",
      "/reset-password",
      "/handler/sign-in"
    ];

    for (const path of publicPaths) {
      const response = await proxy(makeRequest(path) as never);
      expect(response.status).toBe(200);
    }

    expect(redirectFn).not.toHaveBeenCalled();
  });

  it("allows webhooks and next internals without session", async () => {
    const responseA = await proxy(makeRequest("/api/v1/webhooks/video") as never);
    const responseB = await proxy(makeRequest("/_next/static/chunk.js") as never);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(redirectFn).not.toHaveBeenCalled();
  });

  it("redirects protected routes when session cookie is missing", async () => {
    const response = await proxy(makeRequest("/welcome") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/handler/sign-in"
    );
  });

  it("allows protected routes when stack session cookie exists", async () => {
    const response = await proxy(
      makeRequest("/welcome", { "stack-access": "token-1" }) as never
    );

    expect(response.status).toBe(200);
    expect(redirectFn).not.toHaveBeenCalled();
  });
});
import { URL as NodeURL } from "url";
