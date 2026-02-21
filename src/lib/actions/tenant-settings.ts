'use server';

// src/lib/actions/tenant-settings.ts
//
// ============================================================
// WattleOS V2 - Tenant General Settings Server Actions
// ============================================================
// CRUD for the core tenant columns: name, logo_url, timezone,
// country, currency. These are direct columns on the tenants
// table, NOT keys inside the settings JSONB (that's handled by
// display-settings.ts).
//
// WHY admin client: The tenants table only has a SELECT RLS
// policy for authenticated users. There is no UPDATE policy
// because tenant mutations are admin-only operations that go
// through server actions with permission checks. Using the
// service-role admin client bypasses RLS after we've verified
// the user has MANAGE_TENANT_SETTINGS permission.
//
// WHY separate from display-settings.ts: Display settings are
// a JSONB blob inside tenants.settings. These are first-class
// columns. Different concerns, different validation, different
// change frequency.
//
// All actions return ActionResponse<T> — never throw.
// ============================================================

"use server";

import {
  getTenantContext,
  requirePermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  AUSTRALIAN_TIMEZONES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
} from "@/lib/constants/tenant-settings";
import type {
  TenantGeneralSettings,
  UpdateTenantGeneralInput,
} from "@/lib/constants/tenant-settings";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// GET: Tenant General Settings
// ============================================================

export async function getTenantGeneralSettings(): Promise<
  ActionResponse<TenantGeneralSettings>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("name, logo_url, timezone, country, currency")
      .eq("id", context.tenant.id)
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({
      name: data.name,
      logo_url: data.logo_url ?? null,
      timezone: data.timezone,
      country: data.country,
      currency: data.currency,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get tenant settings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE: Tenant General Settings
// ============================================================

export async function updateTenantGeneralSettings(
  input: UpdateTenantGeneralInput,
): Promise<ActionResponse<TenantGeneralSettings>> {
  try {
    // ── Permission gate ─────────────────────────────────────
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    // ── Validate ────────────────────────────────────────────
    if (input.name !== undefined && !input.name.trim()) {
      return failure(
        "School name cannot be empty",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (
      input.timezone !== undefined &&
      !AUSTRALIAN_TIMEZONES.some((tz) => tz.value === input.timezone)
    ) {
      return failure("Invalid timezone", ErrorCodes.VALIDATION_ERROR);
    }

    if (
      input.country !== undefined &&
      !SUPPORTED_COUNTRIES.some((c) => c.value === input.country)
    ) {
      return failure("Invalid country", ErrorCodes.VALIDATION_ERROR);
    }

    if (
      input.currency !== undefined &&
      !SUPPORTED_CURRENCIES.some((c) => c.value === input.currency)
    ) {
      return failure("Invalid currency", ErrorCodes.VALIDATION_ERROR);
    }

    // ── Build update payload (only changed fields) ──────────
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.logo_url !== undefined) updates.logo_url = input.logo_url;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.country !== undefined) updates.country = input.country;
    if (input.currency !== undefined) updates.currency = input.currency;

    if (Object.keys(updates).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    // ── Persist via admin client (bypasses RLS) ─────────────
    const { data, error } = await adminClient
      .from("tenants")
      .update(updates)
      .eq("id", context.tenant.id)
      .select("name, logo_url, timezone, country, currency")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({
      name: data.name,
      logo_url: data.logo_url ?? null,
      timezone: data.timezone,
      country: data.country,
      currency: data.currency,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update tenant settings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPLOAD: Tenant Logo
// ============================================================
// Accepts a FormData with a "file" field. Uploads to Supabase
// Storage under tenant-logos/{tenant_id}/logo.{ext}, then writes
// the public URL back to tenants.logo_url.
//
// WHY FormData: File uploads must go through FormData — you
// can't JSON-serialize a File object in a server action call.
// ============================================================

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function uploadTenantLogo(
  formData: FormData,
): Promise<ActionResponse<{ logo_url: string }>> {
  try {
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return failure("No file provided", ErrorCodes.VALIDATION_ERROR);
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      return failure(
        "Invalid file type. Allowed: PNG, JPEG, WebP, SVG",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return failure(
        "File too large. Maximum size is 2 MB",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // ── Determine file extension ────────────────────────────
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const ext = extMap[file.type] ?? "png";

    // ── Upload to Supabase Storage ──────────────────────────
    // Path: tenant-logos/{tenant_id}/logo.{ext}
    // WHY upsert: Replacing the logo should overwrite, not
    // create duplicates. One logo per tenant.
    const storagePath = `${context.tenant.id}/logo.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("tenant-logos")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return failure(
        `Upload failed: ${uploadError.message}`,
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    // ── Get public URL ──────────────────────────────────────
    const { data: urlData } = adminClient.storage
      .from("tenant-logos")
      .getPublicUrl(storagePath);

    const logoUrl = urlData.publicUrl;

    // ── Write logo_url back to tenant record ────────────────
    const { error: updateError } = await adminClient
      .from("tenants")
      .update({ logo_url: logoUrl })
      .eq("id", context.tenant.id);

    if (updateError) {
      return failure(
        `Logo uploaded but failed to save URL: ${updateError.message}`,
        ErrorCodes.DATABASE_ERROR,
      );
    }

    return success({ logo_url: logoUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload logo";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE: Tenant Logo
// ============================================================
// Removes the logo file from storage and sets logo_url to null.
// ============================================================

export async function deleteTenantLogo(): Promise<ActionResponse<null>> {
  try {
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    // ── List files in the tenant's logo folder ──────────────
    const { data: files } = await adminClient.storage
      .from("tenant-logos")
      .list(context.tenant.id);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${context.tenant.id}/${f.name}`);
      await adminClient.storage.from("tenant-logos").remove(paths);
    }

    // ── Clear logo_url on tenant record ─────────────────────
    const { error } = await adminClient
      .from("tenants")
      .update({ logo_url: null })
      .eq("id", context.tenant.id);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete logo";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}