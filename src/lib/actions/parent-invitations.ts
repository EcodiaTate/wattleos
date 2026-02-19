// src/lib/actions/parent-invitations.ts
//
// ============================================================
// WattleOS V2 - Parent Invitation Server Actions (Module 10)
// ============================================================
// Manages the invite links sent to parents after enrollment
// approval. The flow:
//   1. approveApplication() creates invitations (see enrollment-applications.ts)
//   2. Email with link: yourschool.wattleos.au/invite/{token}
//   3. Parent clicks link → validateInvitation()
//   4. Parent signs in / creates account → acceptInvitation()
//   5. System links parent as guardian to child
//
// WHY tokens (not magic links): Tokens work across devices.
// A parent can receive the email on their phone, then open it
// on their desktop. The token validates independently of the
// session that generated it.
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  ParentInvitation,
  ParentInvitationWithDetails,
} from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateInvitationInput {
  email: string;
  student_id: string;
}

// ============================================================
// LIST INVITATIONS (Admin)
// ============================================================

export async function listParentInvitations(params?: {
  status?: "pending" | "accepted" | "expired" | "revoked";
  student_id?: string;
}): Promise<ActionResponse<ParentInvitationWithDetails[]>> {
  try {
    await requirePermission(Permissions.MANAGE_PARENT_INVITATIONS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("parent_invitations")
      .select(
        `
        *,
        student:students(id, first_name, last_name),
        inviter:users!parent_invitations_invited_by_fkey(id, first_name, last_name)
      `,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.student_id) {
      query = query.eq("student_id", params.student_id);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // NOTE:
    // Supabase nested selects can come back as arrays (even when logically 1:1)
    // depending on relationship configuration. Normalize to the expected shape.
    const normalized: ParentInvitationWithDetails[] = (data ?? []).map(
      (row: any) => {
        const studentRaw = row.student;
        const inviterRaw = row.inviter;

        const student = Array.isArray(studentRaw)
          ? (studentRaw[0] ?? null)
          : (studentRaw ?? null);
        const inviter = Array.isArray(inviterRaw)
          ? (inviterRaw[0] ?? null)
          : (inviterRaw ?? null);

        return {
          ...row,
          student,
          inviter,
        } as ParentInvitationWithDetails;
      },
    );

    return success(normalized);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list invitations";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CREATE INVITATION (Admin - manual invite)
// ============================================================
// Used when an admin wants to manually invite a parent to link
// to an existing student (e.g., a second parent who wasn't on
// the enrollment application).

export async function createParentInvitation(
  input: CreateInvitationInput,
): Promise<ActionResponse<ParentInvitation>> {
  try {
    await requirePermission(Permissions.MANAGE_PARENT_INVITATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.email?.trim()) {
      return failure("Email is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.student_id) {
      return failure("Student ID is required", ErrorCodes.VALIDATION_ERROR);
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", input.student_id)
      .is("deleted_at", null)
      .single();

    if (studentError || !student) {
      return failure("Student not found", ErrorCodes.STUDENT_NOT_FOUND);
    }

    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { data, error } = await supabase
      .from("parent_invitations")
      .insert({
        tenant_id: context.tenant.id,
        email: input.email.trim().toLowerCase(),
        student_id: input.student_id,
        invited_by: context.user.id,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "An invitation already exists for this email and student",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as ParentInvitation);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create invitation";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// VALIDATE INVITATION TOKEN (Public - invite acceptance page)
// ============================================================
// Called when a parent clicks the invite link. Returns the
// invitation details if the token is valid, not expired, and
// not revoked. Does NOT consume the token.

export interface ValidatedInvitation {
  invitation_id: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  student_first_name: string;
  student_last_name: string;
  expires_at: string;
}

export async function validateInvitationToken(
  token: string,
): Promise<ActionResponse<ValidatedInvitation>> {
  try {
    // Use admin client because the parent may not be authenticated yet
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("parent_invitations")
      .select(
        `
        id,
        email,
        tenant_id,
        status,
        expires_at,
        student:students(first_name, last_name),
        tenant:tenants(name, slug)
      `,
      )
      .eq("token", token)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return failure("Invalid invitation link", ErrorCodes.NOT_FOUND);
    }

    // Check status
    if (data.status !== "pending") {
      return failure(
        `This invitation has been ${data.status}`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      // Auto-expire the invitation
      await admin
        .from("parent_invitations")
        .update({ status: "expired" })
        .eq("id", data.id);

      return failure(
        "This invitation has expired",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Supabase may return nested relationships as arrays depending on FK config.
    // Normalize to single objects.
    const studentRaw = (data as any).student;
    const tenantRaw = (data as any).tenant;

    const student = Array.isArray(studentRaw)
      ? (studentRaw[0] ?? null)
      : (studentRaw ?? null);
    const tenant = Array.isArray(tenantRaw)
      ? (tenantRaw[0] ?? null)
      : (tenantRaw ?? null);

    if (!student || !tenant) {
      return failure(
        "Invitation data is incomplete",
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    return success({
      invitation_id: data.id,
      email: data.email,
      tenant_id: data.tenant_id,
      tenant_name: tenant.name,
      tenant_slug: tenant.slug,
      student_first_name: student.first_name,
      student_last_name: student.last_name,
      expires_at: data.expires_at,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to validate invitation";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ACCEPT INVITATION (Authenticated parent)
// ============================================================
// Called after the parent signs in or creates an account.
// Links the parent as a guardian to the child, sets up their
// tenant membership, and marks the invitation as accepted.

export async function acceptInvitation(
  token: string,
): Promise<ActionResponse<{ student_id: string; tenant_slug: string }>> {
  try {
    const admin = createSupabaseAdminClient();

    // Re-validate the token
    const { data: invite, error: inviteError } = await admin
      .from("parent_invitations")
      .select(
        `
        *,
        student:students(id, first_name, last_name),
        tenant:tenants(slug)
      `,
      )
      .eq("token", token)
      .eq("status", "pending")
      .is("deleted_at", null)
      .single();

    if (inviteError || !invite) {
      return failure("Invalid or expired invitation", ErrorCodes.NOT_FOUND);
    }

    if (new Date(invite.expires_at) < new Date()) {
      await admin
        .from("parent_invitations")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return failure(
        "This invitation has expired",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Get the authenticated user from the Supabase session
    const userClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return failure(
        "You must be signed in to accept an invitation",
        ErrorCodes.UNAUTHORIZED,
      );
    }

    // Verify the authenticated user's email matches the invitation
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return failure(
        `This invitation was sent to ${invite.email}. Please sign in with that email address.`,
        ErrorCodes.FORBIDDEN,
      );
    }

    const tenantId = invite.tenant_id;
    const studentId = invite.student_id;

    // 1. Ensure user record exists in our users table
    await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email!,
        first_name: user.user_metadata?.first_name ?? user.email!.split("@")[0],
        last_name: user.user_metadata?.last_name ?? "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

    // 2. Create tenant membership with Parent role
    const { data: parentRole } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", "Parent")
      .single();

    if (parentRole) {
      await admin.from("tenant_users").upsert(
        {
          tenant_id: tenantId,
          user_id: user.id,
          role_id: parentRole.id,
        },
        { onConflict: "tenant_id,user_id", ignoreDuplicates: true },
      );
    }

    // 3. Create guardian link
    await admin.from("guardians").upsert(
      {
        tenant_id: tenantId,
        user_id: user.id,
        student_id: studentId,
        relationship: "parent",
        is_primary: false,
        is_emergency_contact: false,
        pickup_authorized: true,
      },
      { onConflict: "tenant_id,user_id,student_id", ignoreDuplicates: false },
    );

    // 4. Set tenant_id in user's app_metadata for RLS
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { tenant_id: tenantId },
    });

    // 5. Mark invitation as accepted
    await admin
      .from("parent_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invite.id);

    const tenantRaw = (invite as any).tenant;
    const tenant = Array.isArray(tenantRaw)
      ? (tenantRaw[0] ?? null)
      : (tenantRaw ?? null);

    return success({
      student_id: studentId,
      tenant_slug: tenant?.slug ?? "",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept invitation";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RESEND INVITATION (Admin)
// ============================================================
// Generates a new token, extends expiry by 14 days, and
// returns the new invitation. The frontend triggers the email.

export async function resendInvitation(
  invitationId: string,
): Promise<ActionResponse<ParentInvitation>> {
  try {
    await requirePermission(Permissions.MANAGE_PARENT_INVITATIONS);
    const supabase = await createSupabaseServerClient();

    // Verify invitation exists and is pending or expired
    const { data: current, error: fetchError } = await supabase
      .from("parent_invitations")
      .select("status")
      .eq("id", invitationId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Invitation not found", ErrorCodes.NOT_FOUND);
    }

    if (current.status === "accepted") {
      return failure(
        "This invitation has already been accepted",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const newToken = generateSecureToken();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 14);

    const { data, error } = await supabase
      .from("parent_invitations")
      .update({
        token: newToken,
        status: "pending",
        expires_at: newExpiry.toISOString(),
      })
      .eq("id", invitationId)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as ParentInvitation);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to resend invitation";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// REVOKE INVITATION (Admin)
// ============================================================

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResponse<ParentInvitation>> {
  try {
    await requirePermission(Permissions.MANAGE_PARENT_INVITATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("parent_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as ParentInvitation);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to revoke invitation";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// Helpers
// ============================================================

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
