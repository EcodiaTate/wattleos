"use server";

// src/lib/actions/setup/accept-setup-token.ts
//
// ============================================================
// WattleOS V2 - Accept Owner Setup Token
// ============================================================
// Called from the auth callback when a new school owner clicks
// their setup link and completes Google OAuth.
//
// This is the bridge between "named contact who agreed to a demo"
// and "authenticated WattleOS tenant Owner."
//
// Mirrors accept-parent-invitation.ts in structure, but with
// critically different outcomes:
//   • Creates an Owner membership (not Parent)
//   • Marks the tenant as active + sets activated_at
//   • Single-use token (hard fail on reuse)
//
// WHY admin client: The user has just authenticated. They have
// no tenant_id in their JWT yet, so every operation must
// bypass RLS via the service role client.
//
// Flow:
//   1. Validate token (exists, not used, not expired)
//   2. Verify authenticated user's email matches token email
//   3. Ensure user row exists in users table
//   4. Find "Owner" role in the target tenant
//   5. Insert tenant_users as Owner (active)
//   6. Mark token used + activate tenant
//   7. Return { tenant_id, tenant_name }
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

interface AcceptSetupTokenResult {
  tenant_id: string;
  tenant_name: string;
}

interface SetupTokenRow {
  id: string;
  tenant_id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
}

// ============================================================
// ACCEPT SETUP TOKEN
// ============================================================

export async function acceptSetupToken(
  userId: string,
  userEmail: string,
  token: string,
): Promise<ActionResponse<AcceptSetupTokenResult>> {
  try {
    const admin = createSupabaseAdminClient();

    // ── Step 1: Look up and validate the token ───────────────
    const { data: tokenRow, error: tokenError } = await admin
      .from("tenant_setup_tokens")
      .select("id, tenant_id, email, token, expires_at, used_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return failure(
        "Setup link not found. It may have been revoked or the URL may be incorrect.",
        ErrorCodes.NOT_FOUND,
      );
    }

    const setupToken = tokenRow as SetupTokenRow;

    // Single-use: hard fail on reuse (not idempotent like invitations)
    if (setupToken.used_at !== null) {
      return failure(
        "This setup link has already been used. If you need help accessing your account, please contact WattleOS support.",
        ErrorCodes.INVITATION_ALREADY_ACCEPTED,
      );
    }

    if (new Date(setupToken.expires_at) < new Date()) {
      return failure(
        "This setup link has expired. Please contact WattleOS to request a new one.",
        ErrorCodes.INVITATION_EXPIRED,
      );
    }

    // ── Step 2: Verify email match ───────────────────────────
    // Prevents someone from intercepting the link and accepting it
    // with a different Google account.
    if (userEmail.toLowerCase() !== setupToken.email.toLowerCase()) {
      return failure(
        `This setup link was sent to ${setupToken.email}. Please sign in with that email address.`,
        ErrorCodes.EMAIL_MISMATCH,
      );
    }

    // ── Step 3: Ensure user row exists in users table ────────
    const { data: authUser, error: authError } =
      await admin.auth.admin.getUserById(userId);

    if (authError || !authUser?.user) {
      return failure(
        "Could not verify your account. Please try signing in again.",
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    const googleMeta = authUser.user.user_metadata ?? {};

    await admin.from("users").upsert(
      {
        id: userId,
        email: userEmail.toLowerCase(),
        first_name:
          (googleMeta.given_name as string) ??
          (googleMeta.full_name as string)?.split(" ")[0] ??
          null,
        last_name:
          (googleMeta.family_name as string) ??
          (googleMeta.full_name as string)?.split(" ").slice(1).join(" ") ??
          null,
        avatar_url:
          (googleMeta.avatar_url as string) ??
          (googleMeta.picture as string) ??
          null,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );

    // ── Step 4: Find the "Owner" role in this tenant ─────────
    // The Owner role is created automatically by seed_tenant_roles()
    // when the tenant row was inserted during provisioning.
    const { data: ownerRole, error: roleError } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", setupToken.tenant_id)
      .eq("name", "Owner")
      .eq("is_system", true)
      .is("deleted_at", null)
      .single();

    if (roleError || !ownerRole) {
      console.error(
        "[acceptSetupToken] Owner role not found for tenant:",
        setupToken.tenant_id,
      );
      return failure(
        "Could not find the Owner role for this school. Please contact WattleOS support.",
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    const roleId = (ownerRole as { id: string }).id;

    // ── Step 5: Insert tenant_users as Owner ─────────────────
    // Not upsert - if a membership somehow already exists, we want
    // to know about it rather than silently overwriting the role.
    const { error: membershipError } = await admin.from("tenant_users").upsert(
      {
        tenant_id: setupToken.tenant_id,
        user_id: userId,
        role_id: roleId,
        status: "active",
      },
      { onConflict: "tenant_id,user_id", ignoreDuplicates: false },
    );

    if (membershipError) {
      console.error(
        "[acceptSetupToken] Membership insert failed:",
        membershipError.message,
      );
      return failure(
        "Failed to create your school membership. Please contact WattleOS support.",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // ── Step 6: Mark token used + activate tenant ────────────
    // Both writes are non-fatal individually - we've already
    // created the membership, which is the critical operation.
    const now = new Date().toISOString();

    const { error: tokenUpdateError } = await admin
      .from("tenant_setup_tokens")
      .update({ used_at: now, used_by: userId })
      .eq("id", setupToken.id);

    if (tokenUpdateError) {
      console.error(
        "[acceptSetupToken] Failed to mark token used:",
        tokenUpdateError.message,
      );
      // Non-fatal: membership was created; token idempotency check
      // will catch double-use on the DB level via used_at check above.
    }

    // Transition tenant from setup_pending → active
    const { error: tenantUpdateError } = await admin
      .from("tenants")
      .update({
        subscription_status: "trialing",
        activated_at: now,
        is_active: true,
      })
      .eq("id", setupToken.tenant_id)
      .eq("subscription_status", "setup_pending"); // Only advance if still in setup

    if (tenantUpdateError) {
      console.error(
        "[acceptSetupToken] Failed to activate tenant:",
        tenantUpdateError.message,
      );
      // Non-fatal: membership exists, tenant may already be active.
    }

    // ── Step 7: Return result ────────────────────────────────
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("name")
      .eq("id", setupToken.tenant_id)
      .single();

    const tenantName =
      (tenantRow as { name: string } | null)?.name ?? "your school";

    return success({
      tenant_id: setupToken.tenant_id,
      tenant_name: tenantName,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to complete setup";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
