import startServer from "../dist/server/server.js";

function toAbsoluteUrl(request) {
  const requestUrl = request?.url;
  if (typeof requestUrl !== "string" || requestUrl.length === 0) {
    return new URL("http://localhost/");
  }

  try {
    return new URL(requestUrl);
  } catch {
    return new URL(requestUrl, "http://localhost/");
  }
}

export default async function handler(request, env, ctx) {
  const url = toAbsoluteUrl(request);
  const normalizedRequest = new Request(url.toString(), request);
  return startServer.fetch(normalizedRequest, env, ctx);
}
