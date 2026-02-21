'use server';

// src/lib/actions/enroll/accept-parent-invitation.ts
//
// ============================================================
// WattleOS V2 - Accept Parent Invitation (Module 10)
// ============================================================
// Called from the auth callback route after a parent completes
// Google OAuth via an invite link. This is the bridge between
// "anonymous email recipient" and "authenticated WattleOS parent."
//
// WHY admin client: The parent has JUST created their account
// via OAuth. They have no tenant_id in their JWT, no tenant_users
// row, no RLS context whatsoever. Every database operation here
// must bypass RLS via the service role client.
//
// WHY server action (not DB trigger): The cascade involves
// business logic (role lookup, guardian data extraction, email
// matching) that doesn't belong in SQL. Also gives us proper
// error handling and a typed return.
//
// Flow:
//   1. Validate invitation (token, status, expiry)
//   2. Verify authenticated user's email matches invite email
//   3. Ensure user row exists in users table
//   4. Find "Parent" role in the tenant
//   5. Upsert tenant_users membership
//   6. Extract guardian details from the original application
//   7. Upsert guardians record (user ↔ student link)
//   8. Mark invitation as accepted
//
// All operations use createSupabaseAdminClient - never throw.
// ============================================================

"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

interface AcceptInvitationResult {
  tenant_id: string;
  tenant_name: string;
  student_id: string;
  invitation_id: string;
}

interface ParentInvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  student_id: string;
  invited_by: string;
  token: string;
  status: string;
  accepted_at: string | null;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ApplicationGuardianJson {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  is_primary?: boolean;
  is_emergency_contact?: boolean;
  pickup_authorized?: boolean;
}

// ============================================================
// ACCEPT PARENT INVITATION
// ============================================================

export async function acceptParentInvitation(
  userId: string,
  userEmail: string,
  token: string,
): Promise<ActionResponse<AcceptInvitationResult>> {
  try {
    const admin = createSupabaseAdminClient();

    // ── Step 1: Look up and validate the invitation ──────────
    const { data: inviteRow, error: inviteError } = await admin
      .from("parent_invitations")
      .select("*")
      .eq("token", token)
      .is("deleted_at", null)
      .single();

    if (inviteError || !inviteRow) {
      return failure(
        "Invitation not found or has been revoked",
        ErrorCodes.NOT_FOUND,
      );
    }

    const invite = inviteRow as ParentInvitationRow;

    if (invite.status !== "pending") {
      return failure(
        `This invitation has already been ${invite.status}`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired for future lookups
      await admin
        .from("parent_invitations")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return failure(
        "This invitation has expired. Please contact the school to request a new one.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // ── Step 2: Verify email match ───────────────────────────
    // WHY: Prevents someone from intercepting an invite link
    // and accepting it with a different Google account.
    if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return failure(
        `This invitation was sent to ${invite.email}. Please sign in with that email address.`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // ── Step 3: Ensure user row exists in users table ────────
    // WHY: Supabase Auth creates auth.users on OAuth, but our
    // custom users table may not have a row yet for brand-new
    // parents. Upsert ensures idempotency.
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
          (googleMeta.full_name as string)?.split(" ")[0] ??
          (googleMeta.name as string)?.split(" ")[0] ??
          null,
        last_name:
          (googleMeta.full_name as string)?.split(" ").slice(1).join(" ") ??
          (googleMeta.name as string)?.split(" ").slice(1).join(" ") ??
          null,
        avatar_url:
          (googleMeta.avatar_url as string) ??
          (googleMeta.picture as string) ??
          null,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );

    // ── Step 4: Find the "Parent" role in this tenant ────────
    // WHY: tenant_users requires a role_id. The system-default
    // "Parent" role is created during tenant provisioning.
    const { data: parentRole, error: roleError } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", invite.tenant_id)
      .eq("name", "Parent")
      .eq("is_system", true)
      .is("deleted_at", null)
      .single();

    if (roleError || !parentRole) {
      return failure(
        "Could not find the Parent role for this school. Please contact the school administrator.",
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    const roleId = (parentRole as { id: string }).id;

    // ── Step 5: Upsert tenant_users membership ───────────────
    // WHY upsert: Parent may already have a membership if they
    // have another child at this school. We don't want to fail
    // on the unique constraint - just ensure they're active.
    const { error: membershipError } = await admin.from("tenant_users").upsert(
      {
        tenant_id: invite.tenant_id,
        user_id: userId,
        role_id: roleId,
        status: "active",
      },
      { onConflict: "tenant_id,user_id", ignoreDuplicates: false },
    );

    if (membershipError) {
      return failure(
        `Failed to create school membership: ${membershipError.message}`,
        ErrorCodes.CREATE_FAILED,
      );
    }

    // ── Step 6: Extract guardian details from application ─────
    // WHY: The enrollment application has the guardian's
    // relationship, phone, consent flags, etc. We look up the
    // approved application that created this student and pull
    // the matching guardian entry by email.
    let relationship = "parent";
    let isPrimary = true;
    let isEmergencyContact = false;
    let pickupAuthorized = true;
    let phone: string | null = null;
    let mediaConsent = false;
    let directoryConsent = false;

    const { data: appRow } = await admin
      .from("enrollment_applications")
      .select("guardians, media_consent, directory_consent")
      .eq("tenant_id", invite.tenant_id)
      .eq("created_student_id", invite.student_id)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (appRow) {
      const app = appRow as {
        guardians: ApplicationGuardianJson[];
        media_consent: boolean;
        directory_consent: boolean;
      };

      mediaConsent = app.media_consent;
      directoryConsent = app.directory_consent;

      // Find the guardian matching this email
      const guardianList = Array.isArray(app.guardians) ? app.guardians : [];
      const matchingGuardian = guardianList.find(
        (g) => g.email?.toLowerCase() === invite.email.toLowerCase(),
      );

      if (matchingGuardian) {
        relationship = matchingGuardian.relationship ?? "parent";
        isPrimary = matchingGuardian.is_primary ?? true;
        isEmergencyContact = matchingGuardian.is_emergency_contact ?? false;
        pickupAuthorized = matchingGuardian.pickup_authorized ?? true;
        phone = matchingGuardian.phone ?? null;
      }
    }

    // ── Step 7: Upsert guardians record ──────────────────────
    // WHY: This is the critical link between user and student.
    // Without this row, is_guardian_of() returns false and the
    // parent can't see their child's data via RLS.
    const { error: guardianError } = await admin.from("guardians").upsert(
      {
        tenant_id: invite.tenant_id,
        user_id: userId,
        student_id: invite.student_id,
        relationship,
        is_primary: isPrimary,
        is_emergency_contact: isEmergencyContact,
        pickup_authorized: pickupAuthorized,
        phone,
        media_consent: mediaConsent,
        directory_consent: directoryConsent,
      },
      { onConflict: "tenant_id,user_id,student_id", ignoreDuplicates: false },
    );

    if (guardianError) {
      return failure(
        `Failed to link you to your child: ${guardianError.message}`,
        ErrorCodes.CREATE_FAILED,
      );
    }

    // ── Step 8: Mark invitation as accepted ──────────────────
    const { error: acceptError } = await admin
      .from("parent_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq("id", invite.id);

    if (acceptError) {
      // Non-fatal: the parent is already linked. Log but don't fail.
      console.error(
        `[acceptParentInvitation] Failed to mark invite ${invite.id} as accepted:`,
        acceptError.message,
      );
    }

    // ── Step 9: Get tenant name for the response ─────────────
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("name")
      .eq("id", invite.tenant_id)
      .single();

    const tenantName =
      (tenantRow as { name: string } | null)?.name ?? "your school";

    return success({
      tenant_id: invite.tenant_id,
      tenant_name: tenantName,
      student_id: invite.student_id,
      invitation_id: invite.id,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept invitation";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
