import { createSessionCookie, isCorrectPassword } from "./_lib/auth.js";
import { methodNotAllowed, readJson, sendJson } from "./_lib/http.js";

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function getClientKey(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  try {
    const key = getClientKey(request);
    const now = Date.now();
    const previous = attempts.get(key);
    const record =
      previous && now - previous.startedAt < WINDOW_MS
        ? previous
        : { count: 0, startedAt: now };

    if (record.count >= MAX_ATTEMPTS) {
      return sendJson(response, 429, {
        error: "ログイン試行回数が多すぎます。しばらくしてからお試しください。",
      });
    }

    const { password } = await readJson(request);
    if (!isCorrectPassword(password)) {
      record.count += 1;
      attempts.set(key, record);
      return sendJson(response, 401, { error: "パスワードが違います。" });
    }

    attempts.delete(key);
    response.setHeader("Set-Cookie", createSessionCookie());
    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, {
      error: "ログイン設定を確認できませんでした。管理者へお問い合わせください。",
    });
  }
}
