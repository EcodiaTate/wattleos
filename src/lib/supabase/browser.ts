// ============================================================
// WattleOS V2 - Supabase Browser Client
// ============================================================
// Used in 'use client' components for real-time subscriptions
// and client-side queries. Singleton pattern to avoid creating
// multiple GoTrue clients.
// ============================================================

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}
