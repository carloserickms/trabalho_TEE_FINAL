import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const BACKEND_ORIGIN = (() => {
  const viteApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (viteApiUrl && viteApiUrl.trim()) return viteApiUrl.replace(/\/$/, "");

  if (typeof process !== "undefined" && process.env?.API_URL) {
    return process.env.API_URL.replace(/\/$/, "");
  }

  return "http://localhost:8000";
})();

const proxyMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const shouldProxy =
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/v1/") ||
    url.pathname === "/health" ||
    url.pathname === "/init-db" ||
    url.pathname === "/qualis";

  if (!shouldProxy) {
    return next();
  }

  const backend = new URL(BACKEND_ORIGIN);
  const target = new URL(request.url);
  target.protocol = backend.protocol;
  target.hostname = backend.hostname;
  target.port = backend.port;

  return fetch(new Request(target, request));
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [proxyMiddleware, errorMiddleware],
}));
