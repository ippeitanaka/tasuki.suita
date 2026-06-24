export function sendJson(response, status, data) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(data);
}

export async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function methodNotAllowed(response, methods) {
  response.setHeader("Allow", methods.join(", "));
  sendJson(response, 405, { error: "許可されていない操作です。" });
}
