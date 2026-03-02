// src/app/(public)/report-builder/guide-invite/[token]/page.tsx
//
// ============================================================
// WattleOS Report Builder - Guide Invite Acceptance
// ============================================================
// A coordinator sent this guide an invite link. This page:
//   1. Validates the token (exists, not expired, pending)
//   2. Shows the school name and their email
//   3. If new user: shows password field to create account
//   4. On submit: calls acceptGuideInvitation → redirects to
//      /reports/my-reports
//
// Server Component for initial validation; client component
// for the account creation form.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { GuideInviteAcceptClient } from "./guide-invite-accept-client";

export const metadata = { title: "Accept Guide Invitation - WattleOS" };

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function GuideInvitePage({ params }: PageProps) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();

  const { data: invite } = await admin
    .from("guide_invitations")
    .select(
      `
      id, email, status, expires_at, class_labels,
      tenant:tenants(id, name, logo_url)
    `,
    )
    .eq("token", token)
    .is("deleted_at", null)
    .maybeSingle();

  const tenantRow =
    invite && (Array.isArray(invite.tenant) ? invite.tenant[0] : invite.tenant);

  // ── Invalid or missing token ──────────────────────────────
  if (!invite || !tenantRow) {
    return (
      <ErrorPage
        icon="🔗"
        title="Invalid invitation"
        message="This invitation link is not valid. It may have been revoked or the URL may be incorrect. Please contact the coordinator for a new invitation."
      />
    );
  }

  if (invite.status === "accepted") {
    return (
      <ErrorPage
        icon="✓"
        title="Already accepted"
        message={`This invitation has already been accepted. Sign in to ${tenantRow.name} to access your reports.`}
        cta={{ label: "Sign in", href: "/report-builder/login" }}
      />
    );
  }

  if (invite.status !== "pending") {
    return (
      <ErrorPage
        icon="✕"
        title="Invitation no longer valid"
        message="This invitation has been revoked. Please contact your coordinator for a new one."
      />
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <ErrorPage
        icon="⏰"
        title="Invitation expired"
        message={`This invitation has expired. Ask your coordinator at ${tenantRow.name} to send a new one.`}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {tenantRow.logo_url && (
            <img
              src={tenantRow.logo_url}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <span className="font-semibold text-foreground">
            {tenantRow.name}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">
            · WattleOS Report Builder
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <GuideInviteAcceptClient
          token={token}
          inviteId={invite.id}
          email={invite.email}
          schoolName={tenantRow.name}
          classLabels={invite.class_labels ?? []}
        />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Powered by WattleOS
      </footer>
    </div>
  );
}

function ErrorPage({
  icon,
  title,
  message,
  cta,
}: {
  icon: string;
  title: string;
  message: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="mb-4 text-5xl">{icon}</div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {cta && (
          <a
            href={cta.href}
            className="mt-6 inline-flex rounded-lg px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            {cta.label}
          </a>
        )}
      </div>
    </div>
  );
}
