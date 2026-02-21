// src/lib/data-import/mass-invite-actions.ts
//
// ============================================================
// WattleOS V2 - Mass Invite Server Actions
// ============================================================
// WHY: The single-invite flow in parent-invitations.ts handles
// one parent at a time (post-enrollment-approval). Schools
// migrating to WattleOS need to invite ALL existing parents
// and staff in one go. This file handles bulk operations using
// the admin client (service role) to create auth accounts and
// send invitations.
//
// Parent flow: CSV → create parent_invitations → school sends
//   invite emails (or we auto-send via Edge Function).
// Staff flow: CSV → admin.auth.admin.inviteUserByEmail() →
//   creates auth account → creates tenant_users → staff gets
//   email with password-set link.
//
// AUDIT: Uses centralized logAudit() for consistent metadata
// enrichment (IP, user agent, sensitivity, user identity).
//
// All actions return ActionResponse<T> - never throw.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// Types
// ============================================================

export interface MassInviteParentRow {
  guardian_email: string;
  guardian_first_name: string;
  guardian_last_name: string;
  student_first_name: string;
  student_last_name: string;
  relationship: string;
  phone?: string;
  is_primary?: boolean;
}

export interface MassInviteStaffRow {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface MassInviteResult {
  total: number;
  invited: number;
  skipped: number;
  errors: Array<{ row: number; email: string; message: string }>;
}

// ============================================================
// MASS INVITE PARENTS
// ============================================================
// For each row:
// 1. Find the student by name
// 2. Check if a parent_invitation already exists for this email+student
// 3. Create the invitation with a secure token
// 4. (Future: trigger email via Edge Function)
//
// Permission: manage_enrollment (same as enrollment approval)
// ============================================================

export async function massInviteParents(
  rows: MassInviteParentRow[],
): Promise<ActionResponse<MassInviteResult>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ENROLLMENT);
    const admin = createSupabaseAdminClient();
    const tenantId = context.tenant.id;
    const invitedBy = context.user.id;

    const result: MassInviteResult = {
      total: rows.length,
      invited: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Validate email
        if (
          !row.guardian_email ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.guardian_email)
        ) {
          result.errors.push({
            row: rowNum,
            email: row.guardian_email ?? "",
            message: "Invalid email address",
          });
          continue;
        }

        const email = row.guardian_email.toLowerCase().trim();

        // Find the student
        const { data: student } = await admin
          .from("students")
          .select("id")
          .eq("tenant_id", tenantId)
          .ilike("first_name", row.student_first_name.trim())
          .ilike("last_name", row.student_last_name.trim())
          .is("deleted_at", null)
          .limit(1)
          .single();

        if (!student) {
          result.errors.push({
            row: rowNum,
            email,
            message: `Student "${row.student_first_name} ${row.student_last_name}" not found`,
          });
          continue;
        }

        // Check for existing invitation
        const { data: existingInvite } = await admin
          .from("parent_invitations")
          .select("id, status")
          .eq("tenant_id", tenantId)
          .eq("email", email)
          .eq("student_id", student.id)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingInvite) {
          if (existingInvite.status === "accepted") {
            result.skipped++;
            continue; // Already accepted, nothing to do
          }
          if (existingInvite.status === "pending") {
            result.skipped++;
            continue; // Already pending, don't duplicate
          }
          // If expired or revoked, we'll create a new one below
        }

        // Check if user already has an account and is already a guardian
        const { data: existingUser } = await admin
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingUser) {
          // Check if already linked as guardian to this student
          const { data: existingGuardian } = await admin
            .from("guardians")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("user_id", existingUser.id)
            .eq("student_id", student.id)
            .is("deleted_at", null)
            .maybeSingle();

          if (existingGuardian) {
            result.skipped++;
            continue; // Already a guardian, nothing to do
          }

          // User exists but isn't linked - create guardian link + tenant membership directly
          await ensureParentSetup(
            admin,
            tenantId,
            existingUser.id,
            student.id,
            row,
          );
          result.invited++;
          continue;
        }

        // Generate secure token for invite URL
        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // 14-day expiry

        // Create the invitation
        const { error: inviteErr } = await admin
          .from("parent_invitations")
          .insert({
            tenant_id: tenantId,
            email,
            student_id: student.id,
            invited_by: invitedBy,
            token,
            status: "pending",
            expires_at: expiresAt.toISOString(),
          });

        if (inviteErr) {
          // Handle unique constraint violation (email+student already exists)
          if (inviteErr.code === "23505") {
            result.skipped++;
            continue;
          }
          result.errors.push({
            row: rowNum,
            email,
            message: inviteErr.message,
          });
          continue;
        }

        result.invited++;
      } catch (err) {
        result.errors.push({
          row: rowNum,
          email: row.guardian_email ?? "",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // WHY audit: Mass invitations create many parent_invitations at once.
    // Schools need to track who triggered mass invites and the outcome.
    await logAudit({
      context,
      action: AuditActions.INVITATION_SENT,
      entityType: "parent_invitations",
      metadata: {
        batch_type: "mass_invite_parents",
        total: result.total,
        invited: result.invited,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return success(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mass invite parents";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MASS INVITE STAFF
// ============================================================
// For each row:
// 1. Resolve the role by name
// 2. Check if user already exists
// 3. If not: create via admin.auth.admin.inviteUserByEmail()
// 4. Ensure users row + tenant_users membership
//
// Permission: manage_users
// ============================================================

export async function massInviteStaff(
  rows: MassInviteStaffRow[],
): Promise<ActionResponse<MassInviteResult>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const admin = createSupabaseAdminClient();
    const tenantId = context.tenant.id;

    const result: MassInviteResult = {
      total: rows.length,
      invited: 0,
      skipped: 0,
      errors: [],
    };

    // Pre-fetch all roles for the tenant
    const { data: roles } = await admin
      .from("roles")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) {
      roleMap.set(r.name.toLowerCase(), r.id);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Validate
        if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          result.errors.push({
            row: rowNum,
            email: row.email ?? "",
            message: "Invalid email address",
          });
          continue;
        }

        const email = row.email.toLowerCase().trim();

        // Resolve role
        const roleId = roleMap.get(row.role.toLowerCase().trim());
        if (!roleId) {
          result.errors.push({
            row: rowNum,
            email,
            message: `Role "${row.role}" not found. Available: ${[...roleMap.keys()].join(", ")}`,
          });
          continue;
        }

        // Check if user already exists in auth
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const existingAuthUser = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === email,
        );

        let userId: string;

        if (existingAuthUser) {
          userId = existingAuthUser.id;

          // Check if already a tenant member
          const { data: existingMembership } = await admin
            .from("tenant_users")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .is("deleted_at", null)
            .maybeSingle();

          if (existingMembership) {
            result.skipped++;
            continue; // Already a member
          }
        } else {
          // Create new auth user via invite email
          const { data: newUser, error: createErr } =
            await admin.auth.admin.inviteUserByEmail(email, {
              data: {
                first_name: row.first_name.trim(),
                last_name: row.last_name.trim(),
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            });

          if (createErr || !newUser?.user) {
            result.errors.push({
              row: rowNum,
              email,
              message: createErr?.message ?? "Failed to create user account",
            });
            continue;
          }

          userId = newUser.user.id;
        }

        // Ensure users table row exists
        await admin.from("users").upsert(
          {
            id: userId,
            email,
            first_name: row.first_name.trim(),
            last_name: row.last_name.trim(),
          },
          { onConflict: "id", ignoreDuplicates: true },
        );

        // Create tenant membership
        const { error: memberErr } = await admin.from("tenant_users").upsert(
          {
            tenant_id: tenantId,
            user_id: userId,
            role_id: roleId,
            status: existingAuthUser ? "active" : "invited",
          },
          { onConflict: "tenant_id,user_id", ignoreDuplicates: false },
        );

        if (memberErr) {
          result.errors.push({
            row: rowNum,
            email,
            message: memberErr.message,
          });
          continue;
        }

        // Set tenant_id in app_metadata for RLS
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: { tenant_id: tenantId },
        });

        result.invited++;
      } catch (err) {
        result.errors.push({
          row: rowNum,
          email: row.email ?? "",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // WHY audit: Mass staff invitations create auth accounts and tenant
    // memberships. Schools need to track who onboarded which staff members.
    await logAudit({
      context,
      action: AuditActions.INVITATION_SENT,
      entityType: "tenant_users",
      metadata: {
        batch_type: "mass_invite_staff",
        total: result.total,
        invited: result.invited,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return success(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mass invite staff";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MASS INVITE PARENTS + CREATE GUARDIANS (Combined)
// ============================================================
// This is the "nuclear option" for migration: for each parent
// row, it creates the auth account, users record, tenant
// membership, guardian link, AND the parent invitation.
// Used when the school wants to fully onboard all parents at
// once rather than going through the enrollment flow.
//
// Permission: manage_enrollment + manage_students
// ============================================================

export async function massOnboardParents(
  rows: MassInviteParentRow[],
): Promise<ActionResponse<MassInviteResult>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ENROLLMENT);
    // Also check manage_students since we're creating guardian links
    if (!context.permissions.includes(Permissions.MANAGE_STUDENTS)) {
      return failure(
        "Missing manage_students permission",
        ErrorCodes.FORBIDDEN,
      );
    }

    const admin = createSupabaseAdminClient();
    const tenantId = context.tenant.id;

    const result: MassInviteResult = {
      total: rows.length,
      invited: 0,
      skipped: 0,
      errors: [],
    };

    // Pre-fetch parent role
    const { data: parentRole } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", "Parent")
      .is("deleted_at", null)
      .single();

    if (!parentRole) {
      return failure(
        "Parent role not found for this school",
        ErrorCodes.NOT_FOUND,
      );
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        if (
          !row.guardian_email ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.guardian_email)
        ) {
          result.errors.push({
            row: rowNum,
            email: row.guardian_email ?? "",
            message: "Invalid email address",
          });
          continue;
        }

        const email = row.guardian_email.toLowerCase().trim();

        // Find student
        const { data: student } = await admin
          .from("students")
          .select("id")
          .eq("tenant_id", tenantId)
          .ilike("first_name", row.student_first_name.trim())
          .ilike("last_name", row.student_last_name.trim())
          .is("deleted_at", null)
          .limit(1)
          .single();

        if (!student) {
          result.errors.push({
            row: rowNum,
            email,
            message: `Student "${row.student_first_name} ${row.student_last_name}" not found`,
          });
          continue;
        }

        // Find or create auth user
        let userId: string;
        let isNewUser = false;

        const { data: existingUser } = await admin
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create auth account via invite
          const { data: newUser, error: createErr } =
            await admin.auth.admin.inviteUserByEmail(email, {
              data: {
                first_name: row.guardian_first_name.trim(),
                last_name: row.guardian_last_name.trim(),
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            });

          if (createErr || !newUser?.user) {
            result.errors.push({
              row: rowNum,
              email,
              message: createErr?.message ?? "Failed to create account",
            });
            continue;
          }

          userId = newUser.user.id;
          isNewUser = true;

          // Create users table row
          await admin.from("users").upsert(
            {
              id: userId,
              email,
              first_name: row.guardian_first_name.trim(),
              last_name: row.guardian_last_name.trim(),
            },
            { onConflict: "id", ignoreDuplicates: true },
          );
        }

        // Set up the full parent pipeline
        await ensureParentSetup(admin, tenantId, userId, student.id, row);

        // Set tenant_id in app_metadata
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: { tenant_id: tenantId },
        });

        // Create invitation record for tracking
        if (isNewUser) {
          const token = generateSecureToken();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 14);

          await admin.from("parent_invitations").upsert(
            {
              tenant_id: tenantId,
              email,
              student_id: student.id,
              invited_by: context.user.id,
              token,
              status: "pending",
              expires_at: expiresAt.toISOString(),
            },
            {
              onConflict: "tenant_id,email,student_id",
              ignoreDuplicates: false,
            },
          );
        }

        result.invited++;
      } catch (err) {
        result.errors.push({
          row: rowNum,
          email: row.guardian_email ?? "",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // WHY audit: Mass onboarding is the most impactful bulk operation —
    // it creates auth accounts, guardian links, and invitations. Schools
    // need a clear record of who triggered this and the full outcome.
    await logAudit({
      context,
      action: AuditActions.INVITATION_SENT,
      entityType: "guardians",
      metadata: {
        batch_type: "mass_onboard_parents",
        total: result.total,
        invited: result.invited,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return success(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mass onboard parents";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Ensure a user has the full parent setup:
 * 1. Tenant membership with Parent role
 * 2. Guardian link to the student
 */
async function ensureParentSetup(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  tenantId: string,
  userId: string,
  studentId: string,
  row: MassInviteParentRow,
): Promise<void> {
  // Get parent role
  const { data: parentRole } = await admin
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", "Parent")
    .is("deleted_at", null)
    .single();

  if (parentRole) {
    // Create tenant membership
    await admin.from("tenant_users").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role_id: parentRole.id,
        status: "active",
      },
      { onConflict: "tenant_id,user_id", ignoreDuplicates: true },
    );
  }

  // Create guardian link
  await admin.from("guardians").upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      student_id: studentId,
      relationship: normalizeRelationship(row.relationship),
      is_primary: row.is_primary ?? false,
      is_emergency_contact: false,
      pickup_authorized: true,
      phone: row.phone ?? null,
      media_consent: false,
      directory_consent: false,
    },
    {
      onConflict: "tenant_id,user_id,student_id",
      ignoreDuplicates: false,
    },
  );
}

/**
 * Normalize relationship values from various CSV formats.
 */
function normalizeRelationship(value: string): string {
  const lower = (value ?? "").toLowerCase().trim();
  const map: Record<string, string> = {
    mum: "mother",
    mom: "mother",
    mother: "mother",
    dad: "father",
    father: "father",
    grandma: "grandparent",
    grandmother: "grandparent",
    grandpa: "grandparent",
    grandfather: "grandparent",
    nana: "grandparent",
    nan: "grandparent",
    pop: "grandparent",
    grandparent: "grandparent",
    "step-parent": "step-parent",
    "step parent": "step-parent",
    stepmom: "step-parent",
    stepdad: "step-parent",
    "foster-parent": "foster-parent",
    "foster parent": "foster-parent",
    carer: "other",
    guardian: "other",
    aunt: "other",
    uncle: "other",
  };
  return map[lower] ?? "other";
}

/**
 * Generate a URL-safe random token for invite URLs.
 * 32 bytes → 43 characters base64url.
 */
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}