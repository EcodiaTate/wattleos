// src/lib/plg/champion-mechanic.ts
//
// ============================================================
// WattleOS V2 - PLG Champion Mechanic
// ============================================================
// Tracks feature usage across users within a tenant.
// When multiple staff start using WattleOS independently,
// surfaces a data-driven notification to the Head of School
// / Owner showing the accumulated value - and the upgrade path.
//
// WHY: Organic multi-user adoption is the strongest upgrade
// signal. This mechanic surfaces it at the right moment without
// spam. Each threshold fires exactly once per tenant/feature.
//
// Thresholds: 2 users (early signal) → 5 users (team adoption)
//
// Implementation: uses admin client (bypasses RLS) because
// plg_feature_usage and plg_champion_notifications have no
// user-facing RLS (system-only tables).
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Features tracked for Champion Mechanic
export type ChampionFeature =
  | "reports"
  | "observations"
  | "mastery"
  | "curriculum"
  | "admissions";

// Thresholds that trigger notifications (distinct users)
const THRESHOLDS = [2, 5] as const;

// ============================================================
// trackPLGFeatureUse
// ============================================================
// Call this from any server action when a user meaningfully
// engages with a PLG feature. Idempotent per user/feature/day.
// Non-blocking: errors are logged but never propagate.
// ============================================================

export async function trackPLGFeatureUse(
  tenantId: string,
  userId: string,
  feature: ChampionFeature,
): Promise<void> {
  try {
    const admin = await createSupabaseAdminClient();
    const today = new Date().toISOString().split("T")[0];

    // Upsert daily feature usage (idempotent per user/feature/day)
    const { error: upsertError } = await admin
      .from("plg_feature_usage")
      .upsert(
        { tenant_id: tenantId, user_id: userId, feature, used_date: today },
        {
          onConflict: "tenant_id,user_id,feature,used_date",
          ignoreDuplicates: true,
        },
      );

    if (upsertError) {
      console.error("[Champion] Failed to track feature use:", upsertError);
      return;
    }

    // Count distinct users for this feature in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: usageRows, error: countError } = await admin
      .from("plg_feature_usage")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("feature", feature)
      .gte("used_date", thirtyDaysAgo.toISOString().split("T")[0]);

    if (countError || !usageRows) return;

    const distinctUsers = new Set(usageRows.map((r) => r.user_id)).size;

    // Check each threshold
    for (const threshold of THRESHOLDS) {
      if (distinctUsers >= threshold) {
        await maybeFireChampionNotification(
          admin,
          tenantId,
          feature,
          threshold,
          distinctUsers,
        );
      }
    }
  } catch (err) {
    // Never propagate - this is a background tracking call
    console.error("[Champion] Unexpected error:", err);
  }
}

// ============================================================
// maybeFireChampionNotification
// ============================================================
// Fires a notification to the tenant's Owner/Head of School
// when a threshold is crossed. Fires exactly once per
// tenant/feature/threshold combination.
// ============================================================

async function maybeFireChampionNotification(
  admin: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  tenantId: string,
  feature: ChampionFeature,
  threshold: number,
  distinctUsers: number,
): Promise<void> {
  // Check if we've already notified for this threshold
  const { data: existing } = await admin
    .from("plg_champion_notifications")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("feature", feature)
    .eq("threshold", threshold)
    .maybeSingle();

  if (existing) return; // Already notified

  // Mark as notified (upsert for safety against race conditions)
  const { error: insertError } = await admin
    .from("plg_champion_notifications")
    .upsert(
      { tenant_id: tenantId, feature, threshold },
      { onConflict: "tenant_id,feature,threshold", ignoreDuplicates: true },
    );

  if (insertError) {
    console.error("[Champion] Failed to record notification:", insertError);
    return;
  }

  // Build the notification message
  const message = buildChampionMessage(
    feature,
    threshold,
    distinctUsers,
    tenantId,
  );

  // Find the tenant's Owner and Head of School to notify
  await notifyTenantLeaders(admin, tenantId, message);
}

// ============================================================
// buildChampionMessage
// ============================================================

function buildChampionMessage(
  feature: ChampionFeature,
  threshold: number,
  distinctUsers: number,
  _tenantId: string,
): { subject: string; body: string } {
  const featureLabel: Record<ChampionFeature, string> = {
    reports: "term reports",
    observations: "observations",
    mastery: "curriculum & mastery",
    curriculum: "curriculum tracking",
    admissions: "admissions pipeline",
  };

  const label = featureLabel[feature];

  if (threshold === 2) {
    return {
      subject: `${distinctUsers} staff are now using WattleOS ${label}`,
      body: `Two of your staff have started using WattleOS to manage ${label}. Their work is currently siloed - they can't see each other's data, and it's not connected to the rest of the platform. Upgrade WattleOS to bring it all together and unlock the full value of what they're already building.`,
    };
  }

  return {
    subject: `${distinctUsers} staff are actively using WattleOS ${label}`,
    body: `Your team has embraced WattleOS - ${distinctUsers} staff are regularly using the ${label} module. This is significant engagement. On the current plan, their data doesn't connect across modules. Upgrade to the full platform to unlock curriculum integration, parent delivery, and a unified view of your school's data.`,
  };
}

// ============================================================
// notifyTenantLeaders
// ============================================================
// Sends an in-app announcement to users with Owner or HoS roles.
// Falls back gracefully if no messaging infrastructure is available.
// ============================================================

async function notifyTenantLeaders(
  admin: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  tenantId: string,
  message: { subject: string; body: string },
): Promise<void> {
  try {
    // Find Owner-role users for this tenant
    const { data: owners } = await admin
      .from("tenant_users")
      .select("user_id, role:roles(name)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    if (!owners?.length) return;

    // Filter to users whose role name includes 'owner' or 'head'
    const targetUserIds = owners
      .filter((m) => {
        const roleName =
          (Array.isArray(m.role)
            ? m.role[0]?.name
            : (m.role as { name?: string } | null)?.name) ?? "";
        return /owner|head of school/i.test(roleName);
      })
      .map((m) => m.user_id);

    if (!targetUserIds.length) return;

    // Insert a system announcement in the comms module
    // Each target user gets a direct in-app message thread
    // Note: we use the announcements table if it exists,
    // otherwise this is a no-op.
    const { error } = await admin.from("announcements").insert({
      tenant_id: tenantId,
      author_id: null, // system-generated
      title: message.subject,
      body: message.body,
      audience: "custom",
      custom_user_ids: targetUserIds,
      is_pinned: false,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Announcements table structure may differ - log and continue
      console.warn("[Champion] Could not send announcement:", error.message);
    }
  } catch (err) {
    console.error("[Champion] Failed to notify leaders:", err);
  }
}
