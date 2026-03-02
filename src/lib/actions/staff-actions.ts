// src/lib/actions/staff-actions.ts
//
// ============================================================
// WattleOS V2 - Staff Management Actions (Module 15)
// ============================================================
// Server actions for managing staff members, their profiles,
// compliance records, and the roles/permissions system.
//
// All mutations require MANAGE_USERS permission.
// All mutations are audit-logged.
// Soft deletes throughout - no hard deletes.
//
// Exports:
//   Staff CRUD
//     listStaff           - roster with search/filter
//     inviteStaffMember   - send auth invite + create tenant_users
//     getStaffMember      - full profile + compliance
//     updateStaffProfile  - upsert staff_profiles
//     updateStaffRole     - change role in tenant_users
//     suspendStaffMember  - set status = 'suspended'
//     reactivateStaffMember - set status = 'active'
//     removeStaffMember   - soft-delete tenant_users membership
//
//   Compliance
//     listComplianceRecords   - active records for a user
//     upsertComplianceRecord  - create or update
//     deleteComplianceRecord  - soft delete
//
//   Roles
//     listRoles    - all tenant roles with counts
//     getRole      - role detail with permissions + members
//     createRole   - new custom role + permission assignments
//     updateRole   - rename / redescribe / repermission custom role
//     deleteRole   - only if no members, not system
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import type {
  ComplianceRecordType,
  PermissionOverride,
  PermissionOverrideType,
  RoleDetail,
  RoleWithCounts,
  StaffComplianceRecord,
  StaffMember,
  StaffMemberDetail,
  StaffProfile,
  StaffStatus,
} from "@/types/domain";
import { ActionResponse, failure, success, ErrorCodes } from "@/types/api";

// ============================================================
// Helpers
// ============================================================

function normOne<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

// ============================================================
// Staff CRUD
// ============================================================

export interface ListStaffFilters {
  status?: StaffStatus;
  roleId?: string;
  search?: string;
}

/**
 * List all staff members in the current tenant.
 * Requires MANAGE_USERS.
 */
export async function listStaff(
  filters: ListStaffFilters = {},
): Promise<ActionResponse<StaffMember[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("tenant_users")
      .select(
        `
        id,
        status,
        created_at,
        user_id,
        role_id,
        user:users!tenant_users_user_id_fkey(
          id, email, first_name, last_name, avatar_url
        ),
        role:roles!tenant_users_role_id_fkey(
          id, name, is_system
        )
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.roleId) {
      query = query.eq("role_id", filters.roleId);
    }

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const members: StaffMember[] = (data ?? [])
      .map((row) => {
        const user = normOne(
          row.user as unknown as {
            id: string;
            email: string;
            first_name: string | null;
            last_name: string | null;
            avatar_url: string | null;
          } | null,
        );
        const role = normOne(
          row.role as unknown as {
            id: string;
            name: string;
            is_system: boolean;
          } | null,
        );
        if (!user || !role) return null;

        // Apply search filter client-side (small data sets)
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const fullName =
            `${user.first_name ?? ""} ${user.last_name ?? ""}`.toLowerCase();
          if (!fullName.includes(q) && !user.email.toLowerCase().includes(q)) {
            return null;
          }
        }

        return {
          tenant_user_id: row.id,
          status: row.status as StaffStatus,
          joined_at: row.created_at,
          user_id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          role_id: role.id,
          role_name: role.name,
          role_is_system: role.is_system,
        } satisfies StaffMember;
      })
      .filter(Boolean) as StaffMember[];

    return success(members);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

export interface InviteStaffInput {
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
}

/**
 * Invite a new staff member. Creates an auth user (magic-link invite)
 * and a tenant_users membership with status = 'invited'.
 * Requires MANAGE_USERS.
 */
export async function inviteStaffMember(
  input: InviteStaffInput,
): Promise<ActionResponse<{ tenant_user_id: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const admin = await createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    // Validate role belongs to this tenant
    const { data: role, error: roleErr } = await supabase
      .from("roles")
      .select("id, name")
      .eq("id", input.roleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (roleErr || !role) {
      return failure("Role not found in this tenant.", ErrorCodes.NOT_FOUND);
    }

    // Send auth invite (creates auth.users row + sends email)
    const { data: authData, error: authErr } =
      await admin.auth.admin.inviteUserByEmail(input.email, {
        data: {
          first_name: input.firstName ?? null,
          last_name: input.lastName ?? null,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      });

    if (authErr || !authData.user) {
      // If user already exists, that's fine - we'll link them
      if (!authErr?.message.includes("already been registered")) {
        return failure(
          authErr?.message ?? "Failed to create auth user.",
          ErrorCodes.INTERNAL_ERROR,
        );
      }
    }

    const authUserId = authData?.user?.id;

    // Ensure public.users row exists
    if (authUserId) {
      await admin.from("users").upsert(
        {
          id: authUserId,
          email: input.email,
          first_name: input.firstName ?? null,
          last_name: input.lastName ?? null,
        },
        { onConflict: "id", ignoreDuplicates: false },
      );
    }

    // Find the user (might exist already if email was already registered)
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("email", input.email)
      .single();

    const userId = authUserId ?? existingUser?.id;
    if (!userId) {
      return failure("Could not resolve user account.", ErrorCodes.NOT_FOUND);
    }

    // Check if already a member of this tenant
    const { data: existingMembership } = await supabase
      .from("tenant_users")
      .select("id, status, deleted_at")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .single();

    if (existingMembership && !existingMembership.deleted_at) {
      return failure(
        "This user is already a member of your school.",
        "CONFLICT",
      );
    }

    // Create (or restore) the tenant membership
    const now = new Date().toISOString();
    const { data: membership, error: memberErr } = await admin
      .from("tenant_users")
      .upsert(
        {
          tenant_id: context.tenant.id,
          user_id: userId,
          role_id: input.roleId,
          status: "invited",
          deleted_at: null,
          updated_at: now,
          ...(existingMembership ? {} : { created_at: now }),
        },
        { onConflict: "tenant_id,user_id" },
      )
      .select("id")
      .single();

    if (memberErr || !membership) {
      return failure(
        memberErr?.message ?? "Failed to create membership.",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Update app_metadata so they can pick this tenant on sign-in
    // (only if this is their first/only tenant - don't overwrite current)
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { pending_tenant_id: context.tenant.id },
    });

    await logAudit({
      context,
      action: AuditActions.USER_INVITED,
      entityType: "tenant_users",
      entityId: membership.id,
      metadata: {
        email: input.email,
        role_id: input.roleId,
        role_name: role.name,
      },
    });

    return success({ tenant_user_id: membership.id });
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Load a full staff member profile including contact details
 * and compliance records.
 * Requires MANAGE_USERS.
 */
export async function getStaffMember(
  userId: string,
): Promise<ActionResponse<StaffMemberDetail>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    // Fetch tenant membership
    const { data: membership, error: memberErr } = await supabase
      .from("tenant_users")
      .select(
        `
        id, status, created_at, user_id, role_id,
        user:users!tenant_users_user_id_fkey(
          id, email, first_name, last_name, avatar_url
        ),
        role:roles!tenant_users_role_id_fkey(
          id, name, is_system
        )
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (memberErr || !membership) {
      return failure("Staff member not found.", ErrorCodes.NOT_FOUND);
    }

    const user = normOne(
      membership.user as unknown as {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      } | null,
    );
    const role = normOne(
      membership.role as unknown as {
        id: string;
        name: string;
        is_system: boolean;
      } | null,
    );

    if (!user || !role) {
      return failure("Incomplete membership data.", ErrorCodes.DATABASE_ERROR);
    }

    // Fetch extended profile, compliance, role permissions, overrides in parallel
    const [profileResult, complianceResult, rolePermsResult, overridesResult] =
      await Promise.all([
        supabase
          .from("staff_profiles")
          .select("*")
          .eq("tenant_id", context.tenant.id)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("staff_compliance_records")
          .select("*")
          .eq("tenant_id", context.tenant.id)
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("record_type", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("role_permissions")
          .select(
            "permission:permissions!role_permissions_permission_id_fkey(key)",
          )
          .eq("role_id", membership.role_id),
        supabase
          .from("tenant_user_permission_overrides")
          .select(
            "id, tenant_user_id, permission_id, override_type, created_at, permission:permissions!tenant_user_permission_overrides_permission_id_fkey(key)",
          )
          .eq("tenant_user_id", membership.id),
      ]);

    // Resolve role permission keys
    const rolePermKeys = (rolePermsResult.data ?? [])
      .map((rp) => {
        const perm = normOne(
          rp.permission as unknown as { key: string } | null,
        );
        return perm?.key ?? null;
      })
      .filter(Boolean) as string[];

    // Resolve overrides
    const overrides: PermissionOverride[] = (overridesResult.data ?? []).map(
      (ov) => {
        const perm = normOne(
          ov.permission as unknown as { key: string } | null,
        );
        return {
          id: ov.id,
          tenant_user_id: ov.tenant_user_id,
          permission_id: ov.permission_id,
          permission_key: perm?.key ?? "",
          override_type: ov.override_type as PermissionOverrideType,
          created_at: ov.created_at,
        };
      },
    );

    const detail: StaffMemberDetail = {
      tenant_user_id: membership.id,
      status: membership.status as StaffStatus,
      joined_at: membership.created_at,
      user_id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      role_id: role.id,
      role_name: role.name,
      role_is_system: role.is_system,
      profile: (profileResult.data as StaffProfile | null) ?? null,
      compliance_records: (complianceResult.data ??
        []) as StaffComplianceRecord[],
      role_permission_keys: rolePermKeys,
      overrides,
    };

    return success(detail);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

export type UpdateStaffProfileInput = Partial<
  Pick<
    StaffProfile,
    // Personal
    | "date_of_birth"
    // Contact
    | "phone"
    | "address"
    // Emergency
    | "emergency_contact_name"
    | "emergency_contact_phone"
    | "emergency_contact_relationship"
    // Employment
    | "employment_type"
    | "position_title"
    | "start_date"
    | "end_date"
    // Working rights
    | "working_rights"
    | "visa_subclass"
    | "visa_expiry"
    | "work_restrictions"
    // Qualifications
    | "qualification_level"
    | "qualification_detail"
    | "teacher_registration_number"
    | "teacher_registration_state"
    | "teacher_registration_expiry"
    | "acecqa_approval_number"
    // Internal
    | "notes"
  >
>;

/**
 * Create or update a staff member's extended profile.
 * Requires MANAGE_USERS.
 */
export async function updateStaffProfile(
  userId: string,
  input: UpdateStaffProfileInput,
): Promise<ActionResponse<StaffProfile>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("staff_profiles")
      .upsert(
        {
          tenant_id: context.tenant.id,
          user_id: userId,
          ...input,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,user_id" },
      )
      .select("*")
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update profile.",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    return success(data as StaffProfile);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Change a staff member's role.
 * Requires MANAGE_USERS.
 * Cannot reassign to a role from another tenant.
 */
export async function updateStaffRole(
  userId: string,
  roleId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    // Validate role belongs to this tenant
    const { data: role, error: roleErr } = await supabase
      .from("roles")
      .select("id, name")
      .eq("id", roleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (roleErr || !role) {
      return failure("Role not found in this tenant.", ErrorCodes.NOT_FOUND);
    }

    // Get current role for audit log
    const { data: current } = await supabase
      .from("tenant_users")
      .select("role_id, role:roles!tenant_users_role_id_fkey(name)")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    const { error } = await supabase
      .from("tenant_users")
      .update({ role_id: roleId, updated_at: new Date().toISOString() })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const prevRole = normOne(
      current?.role as unknown as { name: string } | null,
    );

    await logAudit({
      context,
      action: AuditActions.USER_ROLE_CHANGED,
      entityType: "tenant_users",
      entityId: userId,
      metadata: {
        user_id: userId,
        previous_role: prevRole?.name ?? null,
        new_role: role.name,
        new_role_id: roleId,
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Suspend a staff member (they can no longer sign in to this tenant).
 * Requires MANAGE_USERS. Cannot suspend yourself.
 */
export async function suspendStaffMember(
  userId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);

    if (userId === context.user.id) {
      return failure(
        "You cannot suspend your own account.",
        ErrorCodes.FORBIDDEN,
      );
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("tenant_users")
      .update({ status: "suspended", updated_at: new Date().toISOString() })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.USER_SUSPENDED,
      entityType: "tenant_users",
      entityId: userId,
      metadata: { user_id: userId },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Reactivate a suspended staff member.
 * Requires MANAGE_USERS.
 */
export async function reactivateStaffMember(
  userId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("tenant_users")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.USER_REACTIVATED,
      entityType: "tenant_users",
      entityId: userId,
      metadata: { user_id: userId },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Remove a staff member from this tenant (soft delete the membership).
 * Does NOT delete the auth.users account - they can still log in to
 * other tenants. Cannot remove yourself.
 * Requires MANAGE_USERS.
 */
export async function removeStaffMember(
  userId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);

    if (userId === context.user.id) {
      return failure(
        "You cannot remove your own account.",
        ErrorCodes.FORBIDDEN,
      );
    }

    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("tenant_users")
      .update({ deleted_at: now, updated_at: now })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.USER_REMOVED,
      entityType: "tenant_users",
      entityId: userId,
      metadata: { user_id: userId },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

// ============================================================
// Compliance Records
// ============================================================

export interface UpsertComplianceInput {
  id?: string; // omit for create
  userId: string;
  record_type: ComplianceRecordType;
  label?: string;
  document_number?: string;
  issuing_state?: string;
  issued_at?: string;
  expires_at?: string;
  document_url?: string;
  notes?: string;
}

/**
 * List active compliance records for a staff member.
 * Requires MANAGE_USERS.
 */
export async function listComplianceRecords(
  userId: string,
): Promise<ActionResponse<StaffComplianceRecord[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("staff_compliance_records")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("record_type")
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as StaffComplianceRecord[]);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Create or update a compliance record.
 * Requires MANAGE_USERS.
 */
export async function upsertComplianceRecord(
  input: UpsertComplianceInput,
): Promise<ActionResponse<StaffComplianceRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const isCreate = !input.id;

    const { data, error } = await supabase
      .from("staff_compliance_records")
      .upsert(
        {
          ...(input.id ? { id: input.id } : {}),
          tenant_id: context.tenant.id,
          user_id: input.userId,
          record_type: input.record_type,
          label: input.label ?? null,
          document_number: input.document_number ?? null,
          issuing_state: input.issuing_state ?? null,
          issued_at: input.issued_at ?? null,
          expires_at: input.expires_at ?? null,
          document_url: input.document_url ?? null,
          notes: input.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to save record.",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    await logAudit({
      context,
      action: isCreate
        ? AuditActions.COMPLIANCE_RECORD_ADDED
        : AuditActions.COMPLIANCE_RECORD_UPDATED,
      entityType: "staff_compliance_records",
      entityId: data.id,
      metadata: {
        user_id: input.userId,
        record_type: input.record_type,
        label: input.label ?? null,
      },
    });

    return success(data as StaffComplianceRecord);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Soft-delete a compliance record.
 * Requires MANAGE_USERS.
 */
export async function deleteComplianceRecord(
  recordId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();

    const { data: record } = await supabase
      .from("staff_compliance_records")
      .select("id, user_id, record_type, label")
      .eq("id", recordId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!record) return failure("Record not found.", ErrorCodes.NOT_FOUND);

    const { error } = await supabase
      .from("staff_compliance_records")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", recordId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.COMPLIANCE_RECORD_DELETED,
      entityType: "staff_compliance_records",
      entityId: recordId,
      metadata: {
        user_id: record.user_id,
        record_type: record.record_type,
        label: record.label,
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

// ============================================================
// Roles
// ============================================================

/**
 * List all tenant roles with member and permission counts.
 * Requires MANAGE_USERS.
 */
export async function listRoles(): Promise<ActionResponse<RoleWithCounts[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const { data: roles, error: rolesErr } = await supabase
      .from("roles")
      .select("id, name, description, is_system, created_at")
      .eq("tenant_id", context.tenant.id)
      .order("is_system", { ascending: false })
      .order("name");

    if (rolesErr) return failure(rolesErr.message, ErrorCodes.DATABASE_ERROR);

    // Get member counts per role
    const { data: memberCounts } = await supabase
      .from("tenant_users")
      .select("role_id")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    // Get permission counts per role
    const { data: permCounts } = await supabase
      .from("role_permissions")
      .select("role_id");

    const memberCountMap: Record<string, number> = {};
    (memberCounts ?? []).forEach((row) => {
      memberCountMap[row.role_id] = (memberCountMap[row.role_id] ?? 0) + 1;
    });

    const permCountMap: Record<string, number> = {};
    (permCounts ?? []).forEach((row) => {
      permCountMap[row.role_id] = (permCountMap[row.role_id] ?? 0) + 1;
    });

    const result = (roles ?? []).map((r) => ({
      id: r.id,
      tenant_id: context.tenant.id,
      name: r.name,
      description: r.description ?? null,
      is_system: r.is_system,
      created_at: r.created_at,
      updated_at: r.created_at,
      member_count: memberCountMap[r.id] ?? 0,
      permission_count: permCountMap[r.id] ?? 0,
    })) as unknown as RoleWithCounts[];

    return success(result);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Load a single role with its full permission list and member list.
 * Requires MANAGE_USERS.
 */
export async function getRole(
  roleId: string,
): Promise<ActionResponse<RoleDetail>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();

    const { data: role, error: roleErr } = await supabase
      .from("roles")
      .select("id, name, description, is_system, created_at")
      .eq("id", roleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (roleErr || !role) {
      return failure("Role not found.", ErrorCodes.NOT_FOUND);
    }

    // Permission keys assigned to this role
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permission:permissions!role_permissions_permission_id_fkey(key)")
      .eq("role_id", roleId);

    const permissionKeys = (perms ?? [])
      .map((p) => {
        const perm = normOne(p.permission as unknown as { key: string } | null);
        return perm?.key ?? null;
      })
      .filter(Boolean) as string[];

    // Members with this role in this tenant
    const { data: members } = await supabase
      .from("tenant_users")
      .select(
        `
        user:users!tenant_users_user_id_fkey(
          id, email, first_name, last_name, avatar_url
        )
      `,
      )
      .eq("role_id", roleId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    const memberList = (members ?? [])
      .map((m) =>
        normOne(
          m.user as unknown as {
            id: string;
            email: string;
            first_name: string | null;
            last_name: string | null;
            avatar_url: string | null;
          } | null,
        ),
      )
      .filter(Boolean) as unknown as RoleDetail["members"];

    return success({
      id: role.id,
      tenant_id: context.tenant.id,
      name: role.name,
      description: role.description ?? null,
      is_system: role.is_system,
      created_at: role.created_at,
      updated_at: role.created_at,
      permission_keys: permissionKeys,
      members: memberList,
    } as unknown as RoleDetail);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionKeys: string[];
}

/**
 * Create a new custom role with the specified permissions.
 * Requires MANAGE_USERS.
 */
export async function createRole(
  input: CreateRoleInput,
): Promise<ActionResponse<{ roleId: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    // Create the role
    const { data: role, error: roleErr } = await admin
      .from("roles")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name,
        description: input.description ?? null,
        is_system: false,
      })
      .select("id")
      .single();

    if (roleErr || !role) {
      return failure(
        roleErr?.message ?? "Failed to create role.",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Assign permissions
    if (input.permissionKeys.length > 0) {
      await assignPermissionsToRole(
        supabase,
        admin,
        role.id,
        input.permissionKeys,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ROLE_CREATED,
      entityType: "roles",
      entityId: role.id,
      metadata: {
        name: input.name,
        permission_count: input.permissionKeys.length,
        permission_keys: input.permissionKeys,
      },
    });

    return success({ roleId: role.id });
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionKeys?: string[];
}

/**
 * Update a custom role's name, description, or permissions.
 * System roles cannot be renamed/redescribed but permissions CAN
 * be modified (schools can restrict default roles if needed).
 * Requires MANAGE_USERS.
 */
export async function updateRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    const { data: role, error: roleErr } = await supabase
      .from("roles")
      .select("id, name, is_system")
      .eq("id", roleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (roleErr || !role) {
      return failure("Role not found.", ErrorCodes.NOT_FOUND);
    }

    // Only allow name/description changes on custom roles
    const metaUpdate: Record<string, string> = {};
    if (!role.is_system) {
      if (input.name !== undefined) metaUpdate.name = input.name;
      if (input.description !== undefined)
        metaUpdate.description = input.description;
    }

    if (Object.keys(metaUpdate).length > 0) {
      const { error } = await supabase
        .from("roles")
        .update({ ...metaUpdate, updated_at: new Date().toISOString() })
        .eq("id", roleId);

      if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Update permissions if provided
    if (input.permissionKeys !== undefined) {
      // Delete all current and reassign
      await admin.from("role_permissions").delete().eq("role_id", roleId);
      if (input.permissionKeys.length > 0) {
        await assignPermissionsToRole(
          supabase,
          admin,
          roleId,
          input.permissionKeys,
        );
      }
    }

    await logAudit({
      context,
      action: AuditActions.ROLE_UPDATED,
      entityType: "roles",
      entityId: roleId,
      metadata: {
        role_name: role.name,
        ...(input.permissionKeys !== undefined
          ? { permission_keys: input.permissionKeys }
          : {}),
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Delete a custom role. Guards:
 *   - Cannot delete system roles
 *   - Cannot delete if any members are assigned
 * Requires MANAGE_USERS.
 */
export async function deleteRole(
  roleId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    const { data: role } = await supabase
      .from("roles")
      .select("id, name, is_system")
      .eq("id", roleId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!role) return failure("Role not found.", ErrorCodes.NOT_FOUND);

    if (role.is_system) {
      return failure("System roles cannot be deleted.", ErrorCodes.FORBIDDEN);
    }

    // Check for members
    const { count } = await supabase
      .from("tenant_users")
      .select("id", { count: "exact", head: true })
      .eq("role_id", roleId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if ((count ?? 0) > 0) {
      return failure(
        `This role has ${count} member(s). Reassign them before deleting.`,
        "CONFLICT",
      );
    }

    // Delete role_permissions first (no cascade on role_id in some schemas)
    await admin.from("role_permissions").delete().eq("role_id", roleId);

    const { error } = await admin.from("roles").delete().eq("id", roleId);
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROLE_DELETED,
      entityType: "roles",
      entityId: roleId,
      metadata: { role_name: role.name },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

// ============================================================
// Internal Helpers
// ============================================================

async function assignPermissionsToRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  admin: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  roleId: string,
  permissionKeys: string[],
): Promise<void> {
  // Resolve permission UUIDs from keys
  const { data: perms } = await supabase
    .from("permissions")
    .select("id, key")
    .in("key", permissionKeys);

  if (!perms || perms.length === 0) return;

  const rows = perms.map((p) => ({
    role_id: roleId,
    permission_id: p.id,
  }));

  await admin.from("role_permissions").insert(rows);
}

// ============================================================
// Permission Overrides
// ============================================================

export interface SetPermissionOverrideInput {
  tenantUserId: string;
  permissionKey: string;
  overrideType: PermissionOverrideType; // "grant" | "deny"
}

/**
 * Set a per-user permission override (grant or deny).
 * If an override already exists for this permission, it's
 * replaced with the new type.
 * Requires MANAGE_USERS.
 */
export async function setPermissionOverride(
  input: SetPermissionOverrideInput,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    // Verify the tenant_user belongs to this tenant
    const { data: tu } = await supabase
      .from("tenant_users")
      .select("id, user_id")
      .eq("id", input.tenantUserId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!tu) {
      return failure("Staff member not found.", ErrorCodes.NOT_FOUND);
    }

    // Resolve permission UUID
    const { data: perm } = await supabase
      .from("permissions")
      .select("id, key")
      .eq("key", input.permissionKey)
      .single();

    if (!perm) {
      return failure("Permission not found.", ErrorCodes.NOT_FOUND);
    }

    // Upsert the override
    const { error } = await admin
      .from("tenant_user_permission_overrides")
      .upsert(
        {
          tenant_user_id: input.tenantUserId,
          permission_id: perm.id,
          override_type: input.overrideType,
        },
        { onConflict: "tenant_user_id,permission_id" },
      );

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.USER_ROLE_CHANGED,
      entityType: "tenant_user_permission_overrides",
      entityId: tu.id,
      metadata: {
        user_id: tu.user_id,
        permission_key: input.permissionKey,
        override_type: input.overrideType,
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}

/**
 * Remove a per-user permission override (revert to role default).
 * Requires MANAGE_USERS.
 */
export async function removePermissionOverride(
  tenantUserId: string,
  permissionKey: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_USERS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    // Verify the tenant_user belongs to this tenant
    const { data: tu } = await supabase
      .from("tenant_users")
      .select("id, user_id")
      .eq("id", tenantUserId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!tu) {
      return failure("Staff member not found.", ErrorCodes.NOT_FOUND);
    }

    // Resolve permission UUID
    const { data: perm } = await supabase
      .from("permissions")
      .select("id")
      .eq("key", permissionKey)
      .single();

    if (!perm) {
      return failure("Permission not found.", ErrorCodes.NOT_FOUND);
    }

    const { error } = await admin
      .from("tenant_user_permission_overrides")
      .delete()
      .eq("tenant_user_id", tenantUserId)
      .eq("permission_id", perm.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.USER_ROLE_CHANGED,
      entityType: "tenant_user_permission_overrides",
      entityId: tu.id,
      metadata: {
        user_id: tu.user_id,
        permission_key: permissionKey,
        action: "override_removed",
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(err instanceof Error ? err.message : "Unknown error");
  }
}
