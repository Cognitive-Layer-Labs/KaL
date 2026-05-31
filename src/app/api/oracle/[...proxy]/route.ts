import { NextRequest, NextResponse } from "next/server";

const ORACLE_BASE_URL = process.env.POCW_ORACLE_BASE_URL;
const ORACLE_API_KEY = process.env.POCW_API_KEY;

const ALLOWED_ROOTS = new Set(["index", "verify", "upload", "graph"]);

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message, code: "INVALID_CONFIG" }, { status });
}

function buildTargetUrl(segments: string[], request: NextRequest): URL {
  if (!ORACLE_BASE_URL) throw new Error("POCW_ORACLE_BASE_URL is missing");
  const root = segments[0];
  if (!root || !ALLOWED_ROOTS.has(root)) throw new Error("Oracle route not allowed");
  const base = ORACLE_BASE_URL.endsWith("/") ? ORACLE_BASE_URL.slice(0, -1) : ORACLE_BASE_URL;
  const url = new URL(`${base}/api/${segments.join("/")}`);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));
  return url;
}

async function proxy(request: NextRequest, segments: string[]): Promise<NextResponse> {
  if (!ORACLE_API_KEY) return jsonError("POCW_API_KEY missing in server env", 500);

  let targetUrl: URL;
  try {
    targetUrl = buildTargetUrl(segments, request);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Bad oracle request", 400);
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${ORACLE_API_KEY}`);
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const method = request.method;
  const body = method !== "GET" && method !== "HEAD"
    ? await request.arrayBuffer()
    : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, { method, headers, body, cache: "no-store" });
  } catch {
    return jsonError("Cannot reach oracle service", 502);
  }

  const resHeaders = new Headers();
  const resType = upstream.headers.get("content-type");
  if (resType) resHeaders.set("content-type", resType);
  const retry = upstream.headers.get("retry-after");
  if (retry) resHeaders.set("retry-after", retry);

  return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders });
}

type RouteContext = { params: Promise<{ proxy: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  return proxy(req, (await ctx.params).proxy);
}
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  return proxy(req, (await ctx.params).proxy);
}
export async function PUT(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  return proxy(req, (await ctx.params).proxy);
}
export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  return proxy(req, (await ctx.params).proxy);
}
export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  return proxy(req, (await ctx.params).proxy);
}
