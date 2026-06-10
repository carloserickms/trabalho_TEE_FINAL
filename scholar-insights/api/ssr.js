import startServer from "../dist/server/server.js";

function getRequestUrl(req) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  return new URL(req.url ?? "/", `${proto}://${host}`);
}

function getRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  return req;
}

function createWebRequest(req) {
  return new Request(getRequestUrl(req), {
    method: req.method,
    headers: req.headers,
    body: getRequestBody(req),
    duplex: "half",
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export default async function handler(req, res) {
  try {
    const response = await startServer.fetch(createWebRequest(req), process.env, {});
    await sendWebResponse(res, response);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
