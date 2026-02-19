// src/app/(public)/invite/[token]/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Invite Acceptance (Module 10)
// ============================================================
// Route: {school}.wattleos.au/invite/{token}
// No auth required to VIEW - shows invite details + "Sign in
// with Google" button. Auth happens inline.
//
// Flow:
// 1. Server validates token (not expired, not revoked)
// 2. Shows school name, student name, parent email
// 3. Parent clicks "Sign in with Google"
// 4. OAuth callback detects pending invite → accepts → redirects
//
// WHY server-side validation: We validate the token before
// showing anything. Invalid/expired tokens get a clean error
// page, not a confusing OAuth flow.
// ============================================================

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteAcceptClient } from "./invite-accept-client";

export const metadata = {
  title: "Accept Invitation - WattleOS",
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

interface InviteData {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  const supabase = await createSupabaseServerClient();

  // Validate token
  const { data: invite, error } = await supabase
    .from("parent_invitations")
    .select(
      `
      id,
      email,
      status,
      expires_at,
      student:students!inner(id, first_name, last_name),
      tenant:tenants!inner(id, name, slug, logo_url)
    `,
    )
    .eq("token", token)
    .is("deleted_at", null)
    .single();

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-5xl">🔗</div>
          <h1 className="text-xl font-bold text-gray-900">
            Invalid Invitation
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This invitation link is not valid. It may have been revoked or the
            URL may be incorrect. Please contact the school for a new
            invitation.
          </p>
        </div>
      </div>
    );
  }

  const inviteData = invite as unknown as InviteData;

  // Check status
  if (inviteData.status === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="text-xl font-bold text-gray-900">Already Accepted</h1>
          <p className="mt-2 text-sm text-gray-500">
            This invitation has already been accepted. You can log in to
            WattleOS to access your parent portal.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (inviteData.status === "revoked") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-5xl">✕</div>
          <h1 className="text-xl font-bold text-gray-900">
            Invitation Revoked
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This invitation has been revoked by the school. Please contact them
            directly if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Check expiry
  const isExpired = new Date(inviteData.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-5xl">⏰</div>
          <h1 className="text-xl font-bold text-gray-900">
            Invitation Expired
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This invitation has expired. Please contact{" "}
            <span className="font-medium">{inviteData.tenant.name}</span> to
            request a new one.
          </p>
        </div>
      </div>
    );
  }

  // Valid invitation - show acceptance UI
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {inviteData.tenant.logo_url && (
            <img
              src={inviteData.tenant.logo_url}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          )}
          <h1 className="text-lg font-semibold text-gray-900">
            {inviteData.tenant.name}
          </h1>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <InviteAcceptClient
          token={token}
          inviteId={inviteData.id}
          email={inviteData.email}
          studentName={`${inviteData.student.first_name} ${inviteData.student.last_name}`}
          schoolName={inviteData.tenant.name}
          tenantId={inviteData.tenant.id}
        />
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-400">
        Powered by WattleOS
      </footer>
    </div>
  );
}
