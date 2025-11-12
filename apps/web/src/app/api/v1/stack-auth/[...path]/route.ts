const STACK_API_BASE = "https://api.stack-auth.com";

type RouteParams = { params: { path: string[] } };

function toRouteParams(context: unknown): RouteParams {
  if (context && typeof context === "object" && "params" in context) {
    const paramsCandidate = (context as { params?: { path?: unknown } }).params;
    if (paramsCandidate && Array.isArray(paramsCandidate.path)) {
      return { params: { path: paramsCandidate.path as string[] } };
    }
  }
  return { params: { path: [] } };
}

async function handle(request: Request, { params }: RouteParams) {
  const path = params.path.join("/");
  const requestUrl = new URL(request.url);
  const targetUrl = `${STACK_API_BASE}/${path}${requestUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  // Stack requires x-stack-access-type when a key is present
  // The SDK sends x-stack-publishable-client-key but not the access type
  if (headers.has("x-stack-publishable-client-key")) {
    headers.set("x-stack-access-type", "client");
  }

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = JSON.stringify(await request.json());
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      body = await request.text();
    } else if (contentType?.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      body = await request.arrayBuffer();
    }
  }

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual"
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export async function GET(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}

export async function POST(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}

export async function PUT(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}

export async function PATCH(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}

export async function DELETE(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}

export async function OPTIONS(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}

export async function HEAD(request: Request, context: unknown) {
  return handle(request, toRouteParams(context));
}
