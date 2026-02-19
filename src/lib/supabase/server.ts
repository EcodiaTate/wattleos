// src/lib/supabase/server.ts

// ============================================================
// WattleOS V2 - Supabase Server Client
// ============================================================
// Used in Server Components and Server Actions.
// Creates a new client per request using cookie-based auth.
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieSerializeOptions } from "cookie";

/**
 * Supabase SSR will call setAll([{ name, value, options }, ...])
 * We type it locally to satisfy noImplicitAny.
 */
type CookieToSet = {
  name: string;
  value: string;
  options?: CookieSerializeOptions;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }: CookieToSet) => {
                // Next's cookieStore.set accepts (name, value, options)
                cookieStore.set(name, value, options);
              }
            );
          } catch {
            // setAll is called from Server Components where cookies
            // can't be set. Safe to ignore; middleware handles refresh.
          }
        },
      },
    }
  );
}

// ============================================================
// Admin Client (service role - bypasses RLS)
// ============================================================

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
