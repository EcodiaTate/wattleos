"use server";

// src/lib/actions/push-tokens.ts
//
// ============================================================
// WattleOS V2 - Push Token Management
// ============================================================
// Stores and manages device push tokens for native notifications.
// Tokens are upserted on app launch and deregistered on sign-out.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// REGISTER PUSH TOKEN
// ============================================================
// Called from NativeInitializer when the device registers with
// APNs (iOS) or FCM (Android). Upserts to handle token refresh.
// ============================================================

export async function registerPushToken(
  token: string,
  platform: "ios" | "android" | "web",
): Promise<ActionResponse<{ registered: boolean }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("device_push_tokens")
      .upsert(
        {
          tenant_id: context.tenant.id,
          user_id: context.user.id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" },
      );

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success({ registered: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to register push token",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DEREGISTER PUSH TOKEN
// ============================================================
// Called on sign-out to stop receiving notifications.
// Hard-deletes the token row (no soft delete needed).
// ============================================================

export async function deregisterPushToken(
  token: string,
): Promise<ActionResponse<{ deregistered: boolean }>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("device_push_tokens")
      .delete()
      .eq("token", token);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deregistered: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to deregister push token",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET TOKENS FOR USERS (admin/service use)
// ============================================================
// Used when sending push notifications to retrieve all device
// tokens for a set of user IDs within a tenant.
// ============================================================

export async function getTokensForUsers(
  tenantId: string,
  userIds: string[],
): Promise<{ userId: string; token: string; platform: string }[]> {
  if (userIds.length === 0) return [];

  // Verify caller belongs to this tenant (defense-in-depth)
  const context = await getTenantContext();
  if (context.tenant.id !== tenantId) return [];

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("device_push_tokens")
    .select("user_id, token, platform")
    .eq("tenant_id", tenantId)
    .in("user_id", userIds);

  if (error || !data) return [];

  return data.map((row) => ({
    userId: (row as { user_id: string }).user_id,
    token: (row as { token: string }).token,
    platform: (row as { platform: string }).platform,
  }));
}
