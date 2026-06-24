import { clearSessionCookie } from "./_lib/auth.js";
import { methodNotAllowed, sendJson } from "./_lib/http.js";

export default function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  response.setHeader("Set-Cookie", clearSessionCookie());
  return sendJson(response, 200, { ok: true });
}
