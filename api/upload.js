import crypto from "node:crypto";
import { isAuthenticated } from "./_lib/auth.js";
import { getSupabaseAdmin, getSupabasePublicConfig } from "./_lib/supabase.js";
import { methodNotAllowed, readJson, sendJson } from "./_lib/http.js";

const BUCKET = "tasuki-media";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_SIZE = 25 * 1024 * 1024;

function safeFileName(value) {
  return String(value || "")
    .normalize("NFKC")
    .split("/")
    .pop()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  if (!isAuthenticated(request)) {
    return sendJson(response, 401, { error: "ログインが必要です。" });
  }

  try {
    const { fileName, contentType, size, category } = await readJson(request);
    if (!ALLOWED_TYPES.has(contentType) || Number(size) <= 0 || Number(size) > MAX_SIZE) {
      return sendJson(response, 400, {
        error: "画像または25MB以下のPDFを選択してください。",
      });
    }

    const folder = category === "documents" ? "documents" : "images";
    const name = safeFileName(fileName) || "upload";
    const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${crypto.randomBytes(5).toString("hex")}-${name}`;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const config = getSupabasePublicConfig();

    return sendJson(response, 200, {
      bucket: BUCKET,
      path,
      token: data.token,
      publicUrl: publicData.publicUrl,
      supabaseUrl: config.url,
      publishableKey: config.publishableKey,
    });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, {
      error: "アップロードの準備に失敗しました。Supabase設定をご確認ください。",
    });
  }
}
