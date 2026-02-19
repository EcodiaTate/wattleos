// src/lib/actions/comms/family-directory.ts
//
// ============================================================
// WattleOS V2 - Module 12: Family Directory & Notification Prefs
// ============================================================
// Manages the opt-in family directory where parents can connect
// with each other, and per-user notification preferences for
// controlling push/email/in-app delivery.
//
// WHY combined file: Directory entries and notification prefs
// are both per-user settings that live in the parent portal
// settings area. Grouping them reduces file sprawl.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { User } from "@/types/domain";

// ============================================================
// Types - Family Directory
// ============================================================

export interface FamilyDirectoryEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string;
  phone_visible: boolean;
  email_visible: boolean;
  children_names: string[];
  bio: string | null;
  interests: string[];
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FamilyDirectoryEntryWithUser extends FamilyDirectoryEntry {
  user: Pick<User, "id" | "email" | "first_name" | "last_name" | "avatar_url">;
}

// ============================================================
// Types - Notification Preferences
// ============================================================

export type NotificationCategory =
  | "announcements"
  | "chat_messages"
  | "observations"
  | "reports"
  | "events"
  | "attendance"
  | "billing"
  | "enrollment";

export type NotificationChannel = "push" | "email" | "in_app";

export interface NotificationPreference {
  id: string;
  tenant_id: string;
  user_id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Input Types
// ============================================================

export interface UpsertDirectoryEntryInput {
  display_name: string;
  phone_visible?: boolean;
  email_visible?: boolean;
  children_names?: string[];
  bio?: string | null;
  interests?: string[];
  is_visible?: boolean;
}

export interface UpdateNotificationPrefInput {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

// ============================================================
// GET MY DIRECTORY ENTRY
// ============================================================
// Returns the current user's directory entry, or null if
// they haven't created one yet.
// ============================================================

export async function getMyDirectoryEntry(): Promise<
  ActionResponse<FamilyDirectoryEntry | null>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("family_directory_entries")
      .select("*")
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as FamilyDirectoryEntry | null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get directory entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPSERT MY DIRECTORY ENTRY
// ============================================================
// Creates or updates the current user's directory listing.
// Uses upsert on (tenant_id, user_id) unique constraint.
// ============================================================

export async function upsertMyDirectoryEntry(
  input: UpsertDirectoryEntryInput,
): Promise<ActionResponse<FamilyDirectoryEntry>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.display_name.trim()) {
      return failure("Display name is required", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("family_directory_entries")
      .upsert(
        {
          tenant_id: context.tenant.id,
          user_id: context.user.id,
          display_name: input.display_name.trim(),
          phone_visible: input.phone_visible ?? false,
          email_visible: input.email_visible ?? true,
          children_names: input.children_names ?? [],
          bio: input.bio?.trim() ?? null,
          interests: input.interests ?? [],
          is_visible: input.is_visible ?? true,
        },
        { onConflict: "tenant_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as FamilyDirectoryEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save directory entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// REMOVE MY DIRECTORY ENTRY (soft delete)
// ============================================================
// Sets is_visible = false and soft-deletes. Effectively
// removes the user from the directory without losing data.
// ============================================================

export async function removeMyDirectoryEntry(): Promise<
  ActionResponse<{ removed: boolean }>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("family_directory_entries")
      .update({
        is_visible: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ removed: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove directory entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// BROWSE DIRECTORY (Parent view)
// ============================================================
// Returns all visible directory entries. Only shows contact
// info fields where the user has opted in (phone_visible,
// email_visible). Respects directory consent.
// ============================================================

export async function browseDirectory(): Promise<
  ActionResponse<FamilyDirectoryEntryWithUser[]>
> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("family_directory_entries")
      .select(
        `
        *,
        user:users!family_directory_entries_user_id_fkey(id, email, first_name, last_name, avatar_url)
      `,
      )
      .eq("is_visible", true)
      .is("deleted_at", null)
      .order("display_name", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Sanitize: remove email/phone from response where not opted in
    const entries = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const entry = row as unknown as FamilyDirectoryEntryWithUser;
        const sanitizedUser = { ...entry.user };

        // If email not visible, redact it
        if (!entry.email_visible) {
          sanitizedUser.email = "";
        }

        return {
          ...entry,
          user: sanitizedUser,
        };
      },
    );

    return success(entries);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to browse directory";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ADMIN: GET ALL DIRECTORY ENTRIES
// ============================================================
// Permission: MANAGE_DIRECTORY
// Returns all entries including hidden ones, for admin review.
// ============================================================

export async function adminListDirectoryEntries(): Promise<
  ActionResponse<FamilyDirectoryEntryWithUser[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_DIRECTORY);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("family_directory_entries")
      .select(
        `
        *,
        user:users!family_directory_entries_user_id_fkey(id, email, first_name, last_name, avatar_url)
      `,
      )
      .is("deleted_at", null)
      .order("display_name", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as FamilyDirectoryEntryWithUser[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list directory entries";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

// ============================================================
// GET MY NOTIFICATION PREFERENCES
// ============================================================
// Returns all notification preferences for the current user.
// If no preferences exist yet, returns an empty array (the UI
// should display defaults as enabled).
// ============================================================

export async function getMyNotificationPreferences(): Promise<
  ActionResponse<NotificationPreference[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.user.id)
      .order("category", { ascending: true })
      .order("channel", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as NotificationPreference[]);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to get notification preferences";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE NOTIFICATION PREFERENCE
// ============================================================
// Upserts a single category/channel preference. The UI
// typically shows a grid of toggles (category × channel).
// ============================================================

export async function updateNotificationPreference(
  input: UpdateNotificationPrefInput,
): Promise<ActionResponse<NotificationPreference>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          tenant_id: context.tenant.id,
          user_id: context.user.id,
          category: input.category,
          channel: input.channel,
          enabled: input.enabled,
        },
        { onConflict: "tenant_id,user_id,category,channel" },
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as NotificationPreference);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update notification preference";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// BULK UPDATE NOTIFICATION PREFERENCES
// ============================================================
// Updates multiple preferences at once. Used when the parent
// toggles "mute all" or saves the full preferences grid.
// ============================================================

export async function bulkUpdateNotificationPreferences(
  preferences: UpdateNotificationPrefInput[],
): Promise<ActionResponse<NotificationPreference[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (preferences.length === 0) {
      return failure("No preferences to update", ErrorCodes.VALIDATION_ERROR);
    }

    const rows = preferences.map((pref) => ({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      category: pref.category,
      channel: pref.channel,
      enabled: pref.enabled,
    }));

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(rows, { onConflict: "tenant_id,user_id,category,channel" })
      .select();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as NotificationPreference[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update preferences";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CHECK IF USER HAS NOTIFICATION ENABLED (internal helper)
// ============================================================
// Used by other modules (e.g., observation publishing,
// attendance marking) to check if a user wants notifications
// for a given category and channel before sending.
//
// Returns true if no preference exists (default = enabled).
// ============================================================

export async function isNotificationEnabled(
  userId: string,
  category: NotificationCategory,
  channel: NotificationChannel,
): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
      .from("notification_preferences")
      .select("enabled")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("channel", channel)
      .maybeSingle();

    // Default to enabled if no preference exists
    if (!data) return true;

    return (data as { enabled: boolean }).enabled;
  } catch {
    // Fail open: if we can't check preferences, allow the notification
    return true;
  }
}
