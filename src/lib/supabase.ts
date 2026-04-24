import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anon);

/**
 * The app runs in two modes:
 *  - Supabase mode: URL + anon key present → real backend.
 *  - JSON fallback mode: no env vars → read-only seed data, no auth.
 *
 * In fallback mode we export null so callers can branch with `if (!supabase)`.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase() ?? "";
