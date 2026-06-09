import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let browserClient: ReturnType<typeof createClient> | null = null;

export const publicStorageBucket = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_BUCKET || "glowea-public";

function normalizeSupabaseUrl(url: string) {
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public environment variables are missing.");
  }

  if (browserClient) return browserClient;

  browserClient = createClient(normalizeSupabaseUrl(supabaseUrl), supabaseAnonKey);
  return browserClient;
}
