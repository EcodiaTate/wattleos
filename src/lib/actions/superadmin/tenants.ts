"use server";

// src/lib/actions/superadmin/tenants.ts
//
// ============================================================
// WattleOS V2 - Super Admin: Tenant Provisioning Actions
// ============================================================
// These actions are exclusively for WattleOS platform staff.
// They use the admin client throughout (bypassing RLS) and
// guard every entry point with requirePlatformAdmin().
//
// WHY a separate file from tenant-settings.ts: tenant-settings
// operates within a tenant context (school admin configuring
// their own school). These actions operate ACROSS tenants with
// no tenant context in the JWT - fundamentally different auth.
//
// Actions:
//   listAllTenants()        - paginated list with billing status
//   getTenantDetail()       - single tenant + active setup tokens
//   createTenant()          - provision + auto-generate setup link
//   generateSetupToken()    - new token for an existing tenant
//   suspendTenant()         - set is_active = false
//   reactivateTenant()      - set is_active = true
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  Tenant,
  TenantSetupToken,
  SubscriptionStatus,
} from "@/types/domain";
import { z } from "zod";

// ============================================================
// Types
// ============================================================

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  plan_tier: string;
  is_active: boolean;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  activated_at: string | null;
  created_at: string;
  user_count: number;
}

export interface TenantDetail extends Tenant {
  user_count: number;
  setup_tokens: TenantSetupToken[];
}

export interface CreateTenantResult {
  tenant_id: string;
  setup_token: string;
  setup_url: string;
}

export interface GenerateSetupTokenResult {
  token: string;
  setup_url: string;
  expires_at: string;
}

// ============================================================
// Guard: requirePlatformAdmin
// ============================================================
// Checks the callers's row in the users table.
// Returns the user_id if admin, throws a failure response otherwise.
// WHY not JWT claim: is_platform_admin is sensitive enough that
// we verify it against the DB on every call, not a cached claim.
// ============================================================

async function requirePlatformAdmin(): Promise<string> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw failure("Not authenticated", ErrorCodes.UNAUTHORIZED);
  }

  const admin = createSupabaseAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("id, is_platform_admin")
    .eq("id", user.id)
    .single();

  if (
    !userRow ||
    !(userRow as { id: string; is_platform_admin: boolean }).is_platform_admin
  ) {
    throw failure("Platform admin access required", ErrorCodes.FORBIDDEN);
  }

  return user.id;
}

// ============================================================
// Validation Schemas
// ============================================================

const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  plan_tier: z.enum(["basic", "pro", "enterprise"]),
  timezone: z.string().min(1),
  country: z.string().length(2),
  currency: z.string().length(3),
  owner_email: z.string().email(),
});

const generateTokenSchema = z.object({
  tenant_id: z.string().uuid(),
  email: z.string().email(),
});

// ============================================================
// HELPERS
// ============================================================

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

// Mirrors seed_tenant_roles() SQL trigger in TypeScript.
// Called after every tenant insert as a guarantee - the DB
// trigger is a second layer, not the first.
//
// Idempotent: skips roles that already exist (ON CONFLICT DO NOTHING).
async function seedTenantRoles(
  admin: SupabaseAdmin,
  tenantId: string,
): Promise<void> {
  // Fetch all permissions upfront - one query, reused for all roles
  const { data: allPerms } = await admin
    .from("permissions")
    .select("id, key, module");

  const perms = (allPerms ?? []) as {
    id: string;
    key: string;
    module: string;
  }[];

  const roleDefinitions = [
    { name: "Owner", description: "Full access to all features and settings" },
    {
      name: "Administrator",
      description: "Administrative access except tenant settings",
    },
    {
      name: "Head of School",
      description: "Pedagogical and operational leadership",
    },
    {
      name: "Lead Guide",
      description: "Lead classroom guide with curriculum management",
    },
    {
      name: "Guide",
      description: "Classroom guide with observation and attendance",
    },
    { name: "Assistant", description: "Assistant guide with limited access" },
    {
      name: "Parent",
      description: "Parent/guardian access to child portfolio",
    },
  ];

  // Upsert all roles - if trigger already created them, this is a no-op
  const { data: insertedRoles } = await admin
    .from("roles")
    .upsert(
      roleDefinitions.map((r) => ({
        tenant_id: tenantId,
        name: r.name,
        description: r.description,
        is_system: true,
      })),
      { onConflict: "tenant_id,name", ignoreDuplicates: true },
    )
    .select("id, name");

  if (!insertedRoles || insertedRoles.length === 0) {
    // Roles already existed - fetch them
  }

  // Fetch roles for this tenant (whether just created or pre-existing)
  const { data: roleRows } = await admin
    .from("roles")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_system", true)
    .is("deleted_at", null);

  const roleMap: Record<string, string> = {};
  for (const r of (roleRows ?? []) as { id: string; name: string }[]) {
    roleMap[r.name] = r.id;
  }

  if (!roleMap["Owner"]) {
    throw new Error(
      `[seedTenantRoles] Owner role missing after upsert for tenant ${tenantId}`,
    );
  }

  // Build permission assignments mirroring seed_tenant_roles() SQL
  const leadGuideKeys = new Set([
    "create_observation",
    "publish_observation",
    "view_all_observations",
    "manage_curriculum",
    "manage_mastery",
    "manage_reports",
    "view_students",
    "view_medical_records",
    "manage_attendance",
    "view_attendance_reports",
    "view_classes",
    "send_class_messages",
  ]);
  const guideKeys = new Set([
    "create_observation",
    "publish_observation",
    "view_students",
    "view_medical_records",
    "manage_attendance",
    "view_classes",
    "manage_mastery",
    "send_class_messages",
  ]);
  const assistantKeys = new Set([
    "create_observation",
    "view_students",
    "manage_attendance",
    "view_classes",
  ]);
  const headModules = new Set(["pedagogy", "sis", "attendance", "comms"]);

  const assignments: {
    tenant_id: string;
    role_id: string;
    permission_id: string;
  }[] = [];

  for (const perm of perms) {
    // Owner - everything
    if (roleMap["Owner"]) {
      assignments.push({
        tenant_id: tenantId,
        role_id: roleMap["Owner"],
        permission_id: perm.id,
      });
    }
    // Administrator - everything except manage_tenant_settings
    if (roleMap["Administrator"] && perm.key !== "manage_tenant_settings") {
      assignments.push({
        tenant_id: tenantId,
        role_id: roleMap["Administrator"],
        permission_id: perm.id,
      });
    }
    // Head of School - pedagogy + sis + attendance + comms modules
    if (roleMap["Head of School"] && headModules.has(perm.module)) {
      assignments.push({
        tenant_id: tenantId,
        role_id: roleMap["Head of School"],
        permission_id: perm.id,
      });
    }
    // Lead Guide
    if (roleMap["Lead Guide"] && leadGuideKeys.has(perm.key)) {
      assignments.push({
        tenant_id: tenantId,
        role_id: roleMap["Lead Guide"],
        permission_id: perm.id,
      });
    }
    // Guide
    if (roleMap["Guide"] && guideKeys.has(perm.key)) {
      assignments.push({
        tenant_id: tenantId,
        role_id: roleMap["Guide"],
        permission_id: perm.id,
      });
    }
    // Assistant
    if (roleMap["Assistant"] && assistantKeys.has(perm.key)) {
      assignments.push({
        tenant_id: tenantId,
        role_id: roleMap["Assistant"],
        permission_id: perm.id,
      });
    }
    // Parent - no permissions
  }

  if (assignments.length > 0) {
    await admin
      .from("role_permissions")
      .upsert(assignments, {
        onConflict: "tenant_id,role_id,permission_id",
        ignoreDuplicates: true,
      });
  }
}

// ============================================================
// ACTIONS
// ============================================================

// ── listAllTenants ─────────────────────────────────────────

export async function listAllTenants(): Promise<
  ActionResponse<TenantSummary[]>
> {
  try {
    const callerId = await requirePlatformAdmin();
    void callerId;

    const admin = createSupabaseAdminClient();

    const { data: tenants, error } = await admin
      .from("tenants")
      .select(
        `
        id,
        slug,
        name,
        plan_tier,
        is_active,
        subscription_status,
        trial_ends_at,
        activated_at,
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listAllTenants] DB error:", error.message);
      return failure("Failed to load tenants", ErrorCodes.DATABASE_ERROR);
    }

    // Fetch user counts in a single query
    const tenantIds = (tenants ?? []).map((t) => t.id as string);

    const { data: countRows } = await admin
      .from("tenant_users")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .is("deleted_at", null);

    const userCountMap: Record<string, number> = {};
    for (const row of countRows ?? []) {
      const r = row as { tenant_id: string };
      userCountMap[r.tenant_id] = (userCountMap[r.tenant_id] ?? 0) + 1;
    }

    const summaries: TenantSummary[] = (tenants ?? []).map((t) => {
      const tenant = t as {
        id: string;
        slug: string;
        name: string;
        plan_tier: string;
        is_active: boolean;
        subscription_status: SubscriptionStatus;
        trial_ends_at: string | null;
        activated_at: string | null;
        created_at: string;
      };
      return {
        ...tenant,
        user_count: userCountMap[tenant.id] ?? 0,
      };
    });

    return success(summaries);
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<TenantSummary[]>;
    }
    return failure("Failed to load tenants", ErrorCodes.INTERNAL_ERROR);
  }
}

// ── getTenantDetail ────────────────────────────────────────

export async function getTenantDetail(
  tenantId: string,
): Promise<ActionResponse<TenantDetail>> {
  try {
    const callerId = await requirePlatformAdmin();
    void callerId;

    const admin = createSupabaseAdminClient();

    const { data: tenant, error } = await admin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (error || !tenant) {
      return failure("Tenant not found", ErrorCodes.TENANT_NOT_FOUND);
    }

    const { data: countRows } = await admin
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const { data: tokens } = await admin
      .from("tenant_setup_tokens")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10);

    return success({
      ...(tenant as Tenant),
      user_count: (countRows ?? []).length,
      setup_tokens: (tokens ?? []) as TenantSetupToken[],
    });
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<TenantDetail>;
    }
    return failure("Failed to load tenant", ErrorCodes.INTERNAL_ERROR);
  }
}

// ── createTenant ───────────────────────────────────────────
// Creates the tenant row (which fires seed_tenant_roles trigger),
// then immediately generates an owner setup token.

export async function createTenant(
  formData: FormData,
): Promise<ActionResponse<CreateTenantResult>> {
  try {
    const callerId = await requirePlatformAdmin();

    const parsed = createTenantSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      plan_tier: formData.get("plan_tier"),
      timezone: formData.get("timezone"),
      country: formData.get("country"),
      currency: formData.get("currency"),
      owner_email: formData.get("owner_email"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return failure(firstError.message, ErrorCodes.VALIDATION_ERROR);
    }

    const { name, slug, plan_tier, timezone, country, currency, owner_email } =
      parsed.data;

    const admin = createSupabaseAdminClient();

    // Check slug uniqueness
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return failure(
        `Slug "${slug}" is already taken`,
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    // Create the tenant - seed_tenant_roles trigger fires automatically
    const { data: newTenant, error: createError } = await admin
      .from("tenants")
      .insert({
        name,
        slug,
        plan_tier,
        timezone,
        country,
        currency,
        is_active: true,
        subscription_status: "setup_pending",
      })
      .select("id, name")
      .single();

    if (createError || !newTenant) {
      console.error("[createTenant] Insert failed:", createError?.message);
      return failure("Failed to create tenant", ErrorCodes.CREATE_FAILED);
    }

    const tenant = newTenant as { id: string; name: string };

    // Explicitly seed roles - do NOT rely solely on the DB trigger.
    // The trigger is a safety net; we own this guarantee in application code.
    try {
      await seedTenantRoles(admin, tenant.id);
    } catch (seedErr) {
      console.error("[createTenant] Role seeding failed:", seedErr);
      return failure(
        'Tenant created but role setup failed. Please use "Repair Roles" on the tenant detail page.',
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Generate the owner setup token immediately
    const { data: tokenRow, error: tokenError } = await admin
      .from("tenant_setup_tokens")
      .insert({
        tenant_id: tenant.id,
        email: owner_email.toLowerCase(),
        created_by: callerId,
      })
      .select("token, expires_at")
      .single();

    if (tokenError || !tokenRow) {
      console.error("[createTenant] Token insert failed:", tokenError?.message);
      // Tenant was created - return partial success with a note
      return failure(
        'Tenant created but setup token generation failed. Use "Generate Setup Link" on the tenant detail page.',
        ErrorCodes.CREATE_FAILED,
      );
    }

    const row = tokenRow as { token: string; expires_at: string };
    const setupUrl = buildSetupUrl(row.token);

    return success({
      tenant_id: tenant.id,
      setup_token: row.token,
      setup_url: setupUrl,
    });
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<CreateTenantResult>;
    }
    return failure("Failed to create tenant", ErrorCodes.INTERNAL_ERROR);
  }
}

// ── generateSetupToken ─────────────────────────────────────
// Generates a new setup token for an existing tenant.
// Old unused tokens remain valid but can be superseded by this one.

export async function generateSetupToken(
  formData: FormData,
): Promise<ActionResponse<GenerateSetupTokenResult>> {
  try {
    const callerId = await requirePlatformAdmin();

    const parsed = generateTokenSchema.safeParse({
      tenant_id: formData.get("tenant_id"),
      email: formData.get("email"),
    });

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { tenant_id, email } = parsed.data;

    const admin = createSupabaseAdminClient();

    // Verify tenant exists
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("id", tenant_id)
      .single();

    if (!tenant) {
      return failure("Tenant not found", ErrorCodes.TENANT_NOT_FOUND);
    }

    const { data: tokenRow, error } = await admin
      .from("tenant_setup_tokens")
      .insert({
        tenant_id,
        email: email.toLowerCase(),
        created_by: callerId,
      })
      .select("token, expires_at")
      .single();

    if (error || !tokenRow) {
      console.error("[generateSetupToken] Insert failed:", error?.message);
      return failure(
        "Failed to generate setup token",
        ErrorCodes.CREATE_FAILED,
      );
    }

    const row = tokenRow as { token: string; expires_at: string };

    return success({
      token: row.token,
      setup_url: buildSetupUrl(row.token),
      expires_at: row.expires_at,
    });
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<GenerateSetupTokenResult>;
    }
    return failure("Failed to generate setup token", ErrorCodes.INTERNAL_ERROR);
  }
}

// ── suspendTenant ──────────────────────────────────────────

export async function suspendTenant(
  tenantId: string,
): Promise<ActionResponse<{ tenant_id: string }>> {
  try {
    const callerId = await requirePlatformAdmin();
    void callerId;

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("tenants")
      .update({ is_active: false, subscription_status: "suspended" })
      .eq("id", tenantId);

    if (error) {
      return failure("Failed to suspend tenant", ErrorCodes.DATABASE_ERROR);
    }

    return success({ tenant_id: tenantId });
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<{ tenant_id: string }>;
    }
    return failure("Failed to suspend tenant", ErrorCodes.INTERNAL_ERROR);
  }
}

// ── ensureTenantRolesSeeded ────────────────────────────────
// Repair action for tenants that were created before the
// explicit seeding was added, or where the trigger failed.
// Safe to call on healthy tenants - all upserts are idempotent.

export async function ensureTenantRolesSeeded(
  tenantId: string,
): Promise<ActionResponse<{ tenant_id: string; roles_seeded: boolean }>> {
  try {
    const callerId = await requirePlatformAdmin();
    void callerId;

    const admin = createSupabaseAdminClient();

    // Verify tenant exists
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return failure("Tenant not found", ErrorCodes.TENANT_NOT_FOUND);
    }

    await seedTenantRoles(admin, tenantId);

    return success({ tenant_id: tenantId, roles_seeded: true });
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<{
        tenant_id: string;
        roles_seeded: boolean;
      }>;
    }
    return failure("Failed to seed roles", ErrorCodes.INTERNAL_ERROR);
  }
}

// ── reactivateTenant ───────────────────────────────────────

export async function reactivateTenant(
  tenantId: string,
): Promise<ActionResponse<{ tenant_id: string }>> {
  try {
    const callerId = await requirePlatformAdmin();
    void callerId;

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("tenants")
      .update({ is_active: true, subscription_status: "active" })
      .eq("id", tenantId);

    if (error) {
      return failure("Failed to reactivate tenant", ErrorCodes.DATABASE_ERROR);
    }

    return success({ tenant_id: tenantId });
  } catch (err) {
    if (err && typeof err === "object" && "error" in err) {
      return err as ActionResponse<{ tenant_id: string }>;
    }
    return failure("Failed to reactivate tenant", ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// Helpers
// ============================================================

function buildSetupUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.wattleos.au";
  return `${base}/setup/${token}`;
}
