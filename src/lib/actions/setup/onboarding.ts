"use server";

// src/lib/actions/setup/onboarding.ts
//
// ============================================================
// WattleOS V2 - First-Run Onboarding Actions
// ============================================================
// Server actions for the setup wizard shown to new school
// owners immediately after accepting their setup token.
//
// All actions require MANAGE_TENANT_SETTINGS - only the Owner
// role has this permission, which is exactly who lands here.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { updateTenantGeneralSettings } from "@/lib/actions/tenant-settings";
import type { UpdateTenantGeneralInput } from "@/lib/constants/tenant-settings";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface OnboardingStatus {
  name: string;
  timezone: string;
  country: string;
  currency: string;
  onboarding_completed_at: string | null;
}

export interface TenantRole {
  id: string;
  name: string;
}

// ============================================================
// GET: Onboarding status
// ============================================================

export async function getOnboardingStatus(): Promise<
  ActionResponse<OnboardingStatus>
> {
  try {
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("name, timezone, country, currency, onboarding_completed_at")
      .eq("id", context.tenant.id)
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({
      name: data.name,
      timezone: data.timezone,
      country: data.country,
      currency: data.currency,
      onboarding_completed_at: data.onboarding_completed_at ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load onboarding status";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET: Tenant roles for role selector dropdown
// ============================================================
// Excludes "Parent" role - not appropriate for staff invites.

export async function getTenantRoles(): Promise<ActionResponse<TenantRole[]>> {
  try {
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("roles")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .neq("name", "Parent")
      .order("name");

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as TenantRole[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load roles";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE: School info during onboarding step 1
// ============================================================
// Thin wrapper - delegates to the existing action so validation
// and audit logging are reused.

export async function saveOnboardingSchoolInfo(
  input: UpdateTenantGeneralInput,
): Promise<ActionResponse<{ name: string }>> {
  const result = await updateTenantGeneralSettings(input);
  if (!result.data) {
    return failure(
      result.error?.message ?? "Failed to save school info",
      result.error?.code ?? ErrorCodes.INTERNAL_ERROR,
    );
  }
  return success({ name: result.data.name });
}

// ============================================================
// UPDATE: Mark onboarding complete
// ============================================================

export async function completeOnboarding(): Promise<ActionResponse<null>> {
  try {
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("tenants")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", context.tenant.id)
      .is("onboarding_completed_at", null); // Idempotent: only set once

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to complete onboarding";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
