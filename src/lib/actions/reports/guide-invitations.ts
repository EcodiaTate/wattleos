"use server";

// src/lib/actions/reports/guide-invitations.ts
//
// ============================================================
// WattleOS Report Builder - Guide Invitation Actions
// ============================================================
// Manages guide_invitations: invite by email, resend, revoke.
//
// Free tier limit: max 5 guides per tenant.
//
// Provides:
//   - listGuideInvitations
//   - inviteGuide
//   - resendGuideInvite
//   - revokeGuideInvite
//   - listActiveGuides (tenant_users with Guide role)
// ============================================================

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  type ActionResponse,
  type PaginatedResponse,
  success,
  failure,
  paginated,
  paginatedFailure,
  ErrorCodes,
} from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface GuideInvitation {
  id: string;
  tenant_id: string;
  email: string;
  invited_by: string;
  token: string;
  class_labels: string[];
  status: "pending" | "accepted" | "expired" | "revoked";
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface ActiveGuide {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  last_active?: string | null;
}

export interface InviteGuideInput {
  email: string;
  class_labels?: string[];
}

const FREE_TIER_GUIDE_LIMIT = 5;

// ============================================================
// LIST INVITATIONS
// ============================================================

export async function listGuideInvitations(): Promise<
  PaginatedResponse<GuideInvitation>
> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, count, error } = await supabase
      .from("guide_invitations")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return paginatedFailure(error.message);

    return paginated(data as GuideInvitation[], count ?? 0, 1, 100);
  } catch {
    return paginatedFailure("Failed to list guide invitations.");
  }
}

// ============================================================
// LIST ACTIVE GUIDES (tenant_users with Guide role)
// ============================================================

export async function listActiveGuides(): Promise<
  ActionResponse<ActiveGuide[]>
> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenant_users")
      .select(
        `
        user_id,
        user:users(id, email, first_name, last_name),
        role:roles(name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (error) return failure(error.message);

    const guides: ActiveGuide[] = (data ?? [])
      .filter((row) => {
        const role = Array.isArray(row.role) ? row.role[0] : row.role;
        return (role as { name?: string } | null)?.name === "Guide";
      })
      .map((row) => {
        const user = Array.isArray(row.user) ? row.user[0] : row.user;
        return {
          user_id: row.user_id,
          email: (user as { email?: string } | null)?.email ?? "",
          first_name:
            (user as { first_name?: string | null } | null)?.first_name ?? null,
          last_name:
            (user as { last_name?: string | null } | null)?.last_name ?? null,
        };
      });

    return success(guides);
  } catch {
    return failure("Failed to list guides.");
  }
}

// ============================================================
// GET GUIDE COUNT (pending + accepted combined)
// ============================================================

export async function getGuideCount(): Promise<ActionResponse<number>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from("guide_invitations")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .in("status", ["pending", "accepted"])
      .is("deleted_at", null);

    if (error) return failure(error.message);
    return success(count ?? 0);
  } catch {
    return failure("Failed to get guide count.");
  }
}

// ============================================================
// INVITE GUIDE
// ============================================================

export async function inviteGuide(
  input: InviteGuideInput,
): Promise<ActionResponse<GuideInvitation>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const email = input.email.trim().toLowerCase();
    if (!email) {
      return failure("Email is required.", ErrorCodes.VALIDATION_ERROR);
    }

    // ── Free tier guide limit ─────────────────────────────────
    const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
    if (planTier === "free") {
      const { count } = await supabase
        .from("guide_invitations")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", context.tenant.id)
        .in("status", ["pending", "accepted"])
        .is("deleted_at", null);

      if ((count ?? 0) >= FREE_TIER_GUIDE_LIMIT) {
        return failure(
          `Free plan supports up to ${FREE_TIER_GUIDE_LIMIT} guides. Upgrade to Pro for unlimited guides.`,
          ErrorCodes.RATE_LIMITED,
        );
      }
    }

    // ── Check for existing invite ─────────────────────────────
    const { data: existing } = await supabase
      .from("guide_invitations")
      .select("id, status")
      .eq("tenant_id", context.tenant.id)
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing?.status === "accepted") {
      return failure(
        "This guide has already accepted their invitation and is active.",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    if (existing?.status === "pending") {
      return failure(
        "An invite is already pending for this email. Resend or revoke it first.",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    // ── Create new invitation ─────────────────────────────────
    const { data, error } = await supabase
      .from("guide_invitations")
      .upsert(
        {
          tenant_id: context.tenant.id,
          email,
          invited_by: context.user.id,
          class_labels: input.class_labels ?? [],
          status: "pending",
          expires_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          deleted_at: null,
        },
        { onConflict: "tenant_id,email", ignoreDuplicates: false },
      )
      .select()
      .single();

    if (error) return failure(error.message);

    // ── TODO: Send invite email ───────────────────────────────
    // In production: send email with link to /report-builder/guide-invite/{token}
    // For now the token is returned and coordinators can share it manually.
    // Email sending is wired up when Resend/SES is configured.

    return success(data as GuideInvitation);
  } catch {
    return failure("Failed to send guide invitation.");
  }
}

// ============================================================
// RESEND INVITE
// ============================================================

export async function resendGuideInvite(
  invitationId: string,
): Promise<ActionResponse<GuideInvitation>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Extend expiry + regenerate token
    const admin = await createSupabaseAdminClient();
    const { data, error } = await admin
      .from("guide_invitations")
      .update({
        status: "pending",
        expires_at: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        token: undefined, // let DB regenerate via DEFAULT
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);
    return success(data as GuideInvitation);
  } catch {
    return failure("Failed to resend invitation.");
  }
}

// ============================================================
// REVOKE INVITE
// ============================================================

export async function revokeGuideInvite(
  invitationId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("guide_invitations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["pending"])
      .is("deleted_at", null);

    if (error) return failure(error.message);
    return success(undefined);
  } catch {
    return failure("Failed to revoke invitation.");
  }
}
