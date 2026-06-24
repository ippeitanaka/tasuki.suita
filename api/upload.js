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

const TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function getExtension(value) {
  const match = String(value || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function safeFileStem(value) {
  const base = String(value || "")
    .normalize("NFKD")
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
  return base || "file";
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  if (!isAuthenticated(request)) {
    return sendJson(response, 401, { error: "ログインが必要です。" });
  }

  try {
    const { fileName, contentType, size, category } = await readJson(request);
    const extension = getExtension(fileName);
    const resolvedContentType = contentType || TYPE_BY_EXTENSION[extension] || "";
    if (
      !ALLOWED_TYPES.has(resolvedContentType) ||
      Number(size) <= 0 ||
      Number(size) > MAX_SIZE
    ) {
      return sendJson(response, 400, {
        error: "画像または25MB以下のPDFを選択してください。",
      });
    }

    const folder = category === "documents" ? "documents" : "images";
    const name = `${safeFileStem(fileName)}.${extension}`;
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
