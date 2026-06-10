import startServer from "../dist/server/server.js";

function toAbsoluteUrl(request) {
  try {
    return new URL(request.url);
  } catch {
    const headers = request.headers;
    const proto = headers.get("x-forwarded-proto") ?? "https";
    const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
    return new URL(request.url, `${proto}://${host}`);
  }
}

export default async function handler(request, env, ctx) {
  const url = toAbsoluteUrl(request);
  const normalizedRequest = new Request(url.toString(), request);
  return startServer.fetch(normalizedRequest, env, ctx);
}
