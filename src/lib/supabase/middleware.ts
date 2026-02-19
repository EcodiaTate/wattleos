// src/lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase SSR middleware passes cookies as:
 *   setAll([{ name, value, options }, ...])
 *
 * We type it locally to satisfy noImplicitAny.
 */
type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Write cookies onto the *request* (so downstream handlers see them)
          cookiesToSet.forEach(({ name, value }: CookieToSet) => {
            request.cookies.set(name, value);
          });

          // Recreate the response so the updated request is carried forward
          supabaseResponse = NextResponse.next({
            request,
          });

          // Also write cookies onto the *response* (so the browser persists them)
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session - critical for keeping the JWT valid
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
