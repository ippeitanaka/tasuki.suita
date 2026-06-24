import { isAuthenticated } from "./_lib/auth.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";
import { methodNotAllowed, readJson, sendJson } from "./_lib/http.js";

const BUCKET = "tasuki-media";

export default async function handler(request, response) {
  if (request.method !== "DELETE") return methodNotAllowed(response, ["DELETE"]);
  if (!isAuthenticated(request)) {
    return sendJson(response, 401, { error: "ログインが必要です。" });
  }

  try {
    const { paths } = await readJson(request);
    const safePaths = Array.isArray(paths)
      ? paths
          .map((path) => String(path || ""))
          .filter((path) => /^(images|documents)\//.test(path))
          .slice(0, 20)
      : [];

    if (safePaths.length) {
      const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove(safePaths);
      if (error) throw error;
    }

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: "ファイルを削除できませんでした。" });
  }
}
