import { createClient } from "@supabase/supabase-js";

let client;

function normalizeSupabaseUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!url.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL must be a Supabase project URL");
  }
  return url.origin;
}

export function getSupabaseAdmin() {
  if (client) return client;

  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return client;
}

export function getSupabasePublicConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase public environment variables are not configured");
  }
  return { url, publishableKey };
}
