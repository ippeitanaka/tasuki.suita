import { getSupabaseAdmin } from "./supabase.js";

function normalizeText(value, maxLength = 5000) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeMedia(media) {
  if (!media || typeof media !== "object") return null;
  const url = normalizeText(media.url, 2000);
  const path = normalizeText(media.path, 500);
  if (!url.startsWith("https://") || !path) return null;

  return {
    url,
    path,
    name: normalizeText(media.name, 200),
    contentType: normalizeText(media.contentType, 100),
    size: Math.max(0, Number(media.size) || 0),
  };
}

export function normalizePosts(value) {
  if (!Array.isArray(value)) throw new Error("投稿データの形式が正しくありません。");

  return value.slice(0, 200).map((post) => ({
    id: normalizeText(post.id, 80),
    title: normalizeText(post.title, 120),
    date: normalizeText(post.date, 10),
    summary: normalizeText(post.summary, 300),
    body: normalizeText(post.body, 10000),
    published: Boolean(post.published),
    images: Array.isArray(post.images)
      ? post.images.map(normalizeMedia).filter(Boolean).slice(0, 8)
      : [],
    pdf: normalizeMedia(post.pdf),
    createdAt: normalizeText(post.createdAt, 40),
    updatedAt: normalizeText(post.updatedAt, 40),
  }));
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.published_on,
    summary: row.summary || "",
    body: row.body || "",
    published: row.is_published,
    images: row.images || [],
    pdf: row.pdf || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(post) {
  return {
    id: post.id,
    title: post.title,
    published_on: post.date,
    summary: post.summary || null,
    body: post.body || null,
    is_published: post.published,
    images: post.images,
    pdf: post.pdf,
    created_at: post.createdAt || new Date().toISOString(),
    updated_at: post.updatedAt || new Date().toISOString(),
  };
}

export async function readPosts({ includeDrafts = false } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("tasuki_news")
    .select("*")
    .order("published_on", { ascending: false })
    .order("updated_at", { ascending: false });

  if (!includeDrafts) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function writePosts(value) {
  const posts = normalizePosts(value);
  const supabase = getSupabaseAdmin();
  const { data: existingRows, error: existingError } = await supabase
    .from("tasuki_news")
    .select("id");
  if (existingError) throw existingError;

  if (posts.length) {
    const { error } = await supabase.from("tasuki_news").upsert(posts.map(toRow));
    if (error) throw error;
  }

  const savedIds = new Set(posts.map((post) => post.id));
  const removedIds = (existingRows || [])
    .map((row) => row.id)
    .filter((id) => !savedIds.has(id));
  if (removedIds.length) {
    const { error: deleteError } = await supabase
      .from("tasuki_news")
      .delete()
      .in("id", removedIds);
    if (deleteError) throw deleteError;
  }

  return readPosts({ includeDrafts: true });
}
