// src/app/(public)/setup/[token]/page.tsx
//
// ============================================================
// WattleOS V2 - Owner Setup Landing Page
// ============================================================
// Route: app.wattleos.au/setup/{token}
// No auth required to VIEW - server validates the token and
// shows school name + email before any OAuth flow begins.
//
// Flow:
// 1. Server validates token (not used, not expired)
// 2. Shows school name, scoped email, "Continue with Google"
// 3. Google OAuth → auth callback detects setup_token
//    → acceptSetupToken() → Owner membership + tenant activated
//    → JWT stamped → redirect to /dashboard
//
// Mirrors /invite/[token]/page.tsx in structure.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { SetupAcceptClient } from "./setup-accept-client";

export const metadata = {
  title: "Set Up Your School - WattleOS",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

interface SetupTokenRow {
  id: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  tenant: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export default async function SetupPage({ params }: PageProps) {
  const { token } = await params;

  // WHY admin client: the token table has no public SELECT policy.
  // We need service role to look up the token before any auth context exists.
  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("tenant_setup_tokens")
    .select(
      `
      id,
      email,
      expires_at,
      used_at,
      tenant:tenants!inner(id, name, logo_url)
    `,
    )
    .eq("token", token)
    .single();

  // ── Invalid token ──────────────────────────────────────────
  if (error || !row) {
    return (
      <ErrorPage
        title="Invalid Link"
        message="This setup link is not valid. Please contact WattleOS support."
      />
    );
  }

  const setupToken = row as unknown as SetupTokenRow;

  // ── Already used ───────────────────────────────────────────
  if (setupToken.used_at !== null) {
    return (
      <ErrorPage
        title="Link Already Used"
        message={`This setup link has already been used to set up ${setupToken.tenant.name}. If you need help accessing your account, contact WattleOS support.`}
        action={{ label: "Go to Login", href: "/login" }}
      />
    );
  }

  // ── Expired ────────────────────────────────────────────────
  if (new Date(setupToken.expires_at) < new Date()) {
    return (
      <ErrorPage
        title="Link Expired"
        message="This setup link has expired. Please contact WattleOS to request a new one."
      />
    );
  }

  // ── Valid - show setup UI ──────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="border-b"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3 px-6 py-4">
          {setupToken.tenant.logo_url ? (
            <img
              src={setupToken.tenant.logo_url}
              alt=""
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {setupToken.tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {setupToken.tenant.name}
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <SetupAcceptClient
          token={token}
          schoolName={setupToken.tenant.name}
          email={setupToken.email}
        />
      </main>

      <footer
        className="border-t px-6 py-4 text-center text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        Powered by WattleOS
      </footer>
    </div>
  );
}

// ── Error helper ───────────────────────────────────────────────

function ErrorPage({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm space-y-4 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{ background: "var(--muted)" }}
        >
          ✕
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {title}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {message}
        </p>
        {action && (
          <a
            href={action.href}
            className="inline-block rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {action.label}
          </a>
        )}
      </div>
    </div>
  );
}
