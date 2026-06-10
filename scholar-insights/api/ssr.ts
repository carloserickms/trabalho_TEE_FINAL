import fs from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

type StartServer = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type ServerModule = {
  default: StartServer;
};

const APP_ROOT = process.cwd();
const CLIENT_DIR = join(APP_ROOT, "dist/client");
const SERVER_ENTRY = join(APP_ROOT, "dist/server/server.js");

let serverModulePromise: Promise<ServerModule> | undefined;

async function getServerModule(): Promise<ServerModule> {
  if (!serverModulePromise) {
    serverModulePromise = import(pathToFileURL(SERVER_ENTRY).href) as Promise<ServerModule>;
  }
  return serverModulePromise;
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function isWithinClientDir(filePath: string): boolean {
  return filePath === CLIENT_DIR || filePath.startsWith(`${CLIENT_DIR}/`);
}

async function tryServeStatic(pathname: string): Promise<Response | null> {
  const cleanPath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");
  if (!cleanPath) return null;

  const candidate = normalize(join(CLIENT_DIR, cleanPath));
  if (!isWithinClientDir(candidate)) return null;

  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) return null;

    const body = await fs.readFile(candidate);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentTypeFor(candidate),
        "cache-control": candidate.includes("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return null;
  }
}

function buildOriginalUrl(request: Request): URL {
  const url = new URL(request.url);
  const originalPath = url.searchParams.get("path") ?? "";
  url.searchParams.delete("path");

  const pathname = `/${originalPath.replace(/^\/+/, "")}`.replace(/\/+$/, "");
  const normalizedPathname = pathname === "/" ? "/" : pathname;
  const original = new URL(request.url);
  original.pathname = normalizedPathname;
  original.search = url.search;
  return original;
}

async function requestToBody(request: Request): Promise<BodyInit | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  return request.arrayBuffer();
}

async function toFetchRequest(request: Request): Promise<Request> {
  const headers = new Headers(request.headers);
  headers.delete("host");

  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body ?? undefined,
  });
}

async function responseToWebResponse(response: Response): Promise<Response> {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export default async function handler(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  const originalUrl = buildOriginalUrl(request);
  const staticResponse = await tryServeStatic(originalUrl.pathname);
  if (staticResponse) return staticResponse;

  const serverModule = await getServerModule();
  const proxiedRequest = await toFetchRequest(
    new Request(originalUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: await requestToBody(request),
    }),
  );
  const response = await serverModule.default.fetch(proxiedRequest, env, ctx);
  return responseToWebResponse(response instanceof Response ? response : new Response(response));
}
