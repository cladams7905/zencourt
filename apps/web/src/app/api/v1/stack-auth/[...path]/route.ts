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

  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;
  if (projectId && secretServerKey) {
    headers.set("x-stack-access-type", "server");
    headers.set("x-stack-project-id", projectId);
    headers.set("x-stack-secret-server-key", secretServerKey);
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
