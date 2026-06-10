import startServer from "../dist/server/server.js";

export default async function handler(
  request: Request,
  env: unknown,
  ctx: unknown,
): Promise<Response> {
  return startServer.fetch(request, env, ctx);
}
