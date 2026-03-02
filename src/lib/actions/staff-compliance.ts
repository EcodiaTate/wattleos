"use server";

// src/lib/actions/staff-compliance.ts
//
// ============================================================
// WattleOS V2 - Module C: Staff Qualification & Compliance
// (Reg 136/145/146)
// ============================================================
// Dedicated compliance tracking for staff qualifications,
// WWCC, first aid, CPR, anaphylaxis, asthma, Geccko child
// safety training, and the National Early Childhood Worker
// Register (mandatory from 27 Feb 2026).
//
// These actions operate on the `staff_compliance_profiles` and
// `staff_certificates` tables (from migration 00004_compliance_modules).
// They are SEPARATE from the Module 15 HR staff management
// tables (`staff_profiles` / `staff_compliance_records`).
//
// Permissions:
//   VIEW_STAFF_COMPLIANCE   - read dashboard, detail, expiry data
//   MANAGE_STAFF_COMPLIANCE - write profile, certificates, verify
//   EXPORT_WORKER_REGISTER  - generate NQA ITS CSV export
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  ComplianceItemStatus,
  StaffCertificate,
  StaffCertType,
  StaffComplianceProfile,
  StaffComplianceSummary,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  upsertComplianceProfileSchema,
  upsertCertificateSchema,
  updateComplianceSettingsSchema,
  bulkCertificateImportSchema,
  type UpsertComplianceProfileInput,
  type UpsertCertificateInput,
  type UpdateComplianceSettingsInput,
  type BulkCertificateImportInput,
} from "@/lib/validations/staff-compliance";
import {
  type ComplianceSettings,
  DEFAULT_COMPLIANCE_SETTINGS,
} from "@/lib/constants/tenant-settings";

// ============================================================
// Constants
// ============================================================

/** Default days before expiry to flag (overridden by tenant settings). */
const EXPIRY_WARNING_DAYS_DEFAULT = 60;

/** Certificate types that are mandatory for all educators. */
const MANDATORY_CERT_TYPES: StaffCertType[] = [
  "first_aid",
  "cpr",
  "anaphylaxis",
  "asthma",
  "child_safety",
  "mandatory_reporting",
  "food_safety",
];

/** Standard expiry periods (in years) per certificate type. */
const CERT_EXPIRY_YEARS: Partial<Record<StaffCertType, number>> = {
  first_aid: 3,
  cpr: 1,
  anaphylaxis: 3,
  asthma: 3,
  mandatory_reporting: 2,
  food_safety: 5,
};

// ============================================================
// Helpers
// ============================================================

/** Read compliance settings from tenants.settings JSONB. */
async function readComplianceSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
): Promise<ComplianceSettings> {
  const { data } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const raw = (data?.settings as Record<string, unknown>)?.compliance;
  if (!raw || typeof raw !== "object") return DEFAULT_COMPLIANCE_SETTINGS;

  return {
    ect_children_per_educator:
      typeof (raw as Record<string, unknown>).ect_children_per_educator ===
      "number"
        ? ((raw as Record<string, unknown>).ect_children_per_educator as number)
        : DEFAULT_COMPLIANCE_SETTINGS.ect_children_per_educator,
    qualification_target_pct:
      typeof (raw as Record<string, unknown>).qualification_target_pct ===
      "number"
        ? ((raw as Record<string, unknown>).qualification_target_pct as number)
        : DEFAULT_COMPLIANCE_SETTINGS.qualification_target_pct,
    expiry_warning_days:
      typeof (raw as Record<string, unknown>).expiry_warning_days === "number"
        ? ((raw as Record<string, unknown>).expiry_warning_days as number)
        : DEFAULT_COMPLIANCE_SETTINGS.expiry_warning_days,
    nominated_supervisor_id:
      typeof (raw as Record<string, unknown>).nominated_supervisor_id ===
      "string"
        ? ((raw as Record<string, unknown>).nominated_supervisor_id as string)
        : null,
  };
}

function computeItemStatus(
  expiryDateStr: string | null,
  today: Date,
  warningDays: number = EXPIRY_WARNING_DAYS_DEFAULT,
): ComplianceItemStatus {
  if (!expiryDateStr) return "missing";
  const expiry = new Date(expiryDateStr);
  if (expiry < today) return "expired";
  const daysUntil = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntil <= warningDays) return "expiring_soon";
  return "valid";
}

function daysUntilExpiry(
  expiryDateStr: string | null,
  today: Date,
): number | null {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Find the most recent non-deleted certificate of a given type.
 * If multiple exist, prefer the one with the latest expiry_date.
 */
function latestCertOfType(
  certs: StaffCertificate[],
  type: StaffCertType,
): StaffCertificate | null {
  const matching = certs
    .filter((c) => c.cert_type === type && !c.deleted_at)
    .sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return b.expiry_date.localeCompare(a.expiry_date);
    });
  return matching[0] ?? null;
}

function certStatusForType(
  certs: StaffCertificate[],
  type: StaffCertType,
  today: Date,
  warningDays: number = EXPIRY_WARNING_DAYS_DEFAULT,
): ComplianceItemStatus {
  const cert = latestCertOfType(certs, type);
  if (!cert) return "missing";
  return computeItemStatus(cert.expiry_date, today, warningDays);
}

// ============================================================
// READ: Compliance Dashboard
// ============================================================

export interface ComplianceDashboardData {
  staff: StaffComplianceSummary[];
  stats: {
    total_staff: number;
    fully_compliant: number;
    expiring_soon: number;
    non_compliant: number;
  };
  ect_ratio: {
    enrolled_children: number;
    ect_staff_count: number;
    required_ect_count: number;
    is_met: boolean;
  };
  qualification_ratio: {
    total_active_staff: number;
    diploma_or_higher_count: number;
    percentage: number;
    is_met: boolean;
  };
}

export async function getComplianceDashboard(): Promise<
  ActionResponse<ComplianceDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_STAFF_COMPLIANCE);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;
    const today = new Date();

    // 0. Read configurable compliance settings
    const settings = await readComplianceSettings(supabase, tenantId);
    const warningDays = settings.expiry_warning_days;

    // 1. Get all active staff (non-deleted tenant_users with user data)
    const { data: staffRows, error: staffError } = await supabase
      .from("tenant_users")
      .select(
        `
        user_id,
        users!inner(id, first_name, last_name, email, avatar_url)
      `,
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .neq("status", "suspended");

    if (staffError) {
      return failure(staffError.message, ErrorCodes.DATABASE_ERROR);
    }

    const activeStaff = (staffRows ?? []).filter(
      (r) => r.users && !Array.isArray(r.users),
    );
    const userIds = activeStaff.map((r) => r.user_id);

    if (userIds.length === 0) {
      return success({
        staff: [],
        stats: {
          total_staff: 0,
          fully_compliant: 0,
          expiring_soon: 0,
          non_compliant: 0,
        },
        ect_ratio: {
          enrolled_children: 0,
          ect_staff_count: 0,
          required_ect_count: 0,
          is_met: true,
        },
        qualification_ratio: {
          total_active_staff: 0,
          diploma_or_higher_count: 0,
          percentage: 100,
          is_met: true,
        },
      });
    }

    // 2. Get all compliance profiles
    const { data: profiles } = await supabase
      .from("staff_compliance_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("user_id", userIds)
      .is("deleted_at", null);

    // 3. Get all certificates
    const { data: certificates } = await supabase
      .from("staff_certificates")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("user_id", userIds)
      .is("deleted_at", null);

    // 4. Get enrolled children count (for ECT ratio)
    const { count: enrolledCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "enrolled");

    // 5. Build per-staff summaries
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p as StaffComplianceProfile]),
    );
    const certMap = new Map<string, StaffCertificate[]>();
    for (const cert of (certificates ?? []) as StaffCertificate[]) {
      const existing = certMap.get(cert.user_id) ?? [];
      existing.push(cert);
      certMap.set(cert.user_id, existing);
    }

    let fullyCompliant = 0;
    let expiringSoon = 0;
    let nonCompliant = 0;
    let ectCount = 0;
    let diplomaOrHigher = 0;

    const summaries: StaffComplianceSummary[] = activeStaff.map((row) => {
      const rawUser = row.users as unknown as
        | {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string;
            avatar_url: string | null;
          }
        | {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string;
            avatar_url: string | null;
          }[];
      const user = Array.isArray(rawUser) ? rawUser[0] : rawUser;
      const profile = profileMap.get(row.user_id) ?? null;
      const certs = certMap.get(row.user_id) ?? [];

      const wwccStatus = computeItemStatus(
        profile?.wwcc_expiry ?? null,
        today,
        warningDays,
      );
      const firstAidStatus = certStatusForType(
        certs,
        "first_aid",
        today,
        warningDays,
      );
      const cprStatus = certStatusForType(certs, "cpr", today, warningDays);
      const anaphylaxisStatus = certStatusForType(
        certs,
        "anaphylaxis",
        today,
        warningDays,
      );
      const asthmaStatus = certStatusForType(
        certs,
        "asthma",
        today,
        warningDays,
      );
      const mandatoryReportingStatus = certStatusForType(
        certs,
        "mandatory_reporting",
        today,
        warningDays,
      );
      const foodSafetyStatus = certStatusForType(
        certs,
        "food_safety",
        today,
        warningDays,
      );
      const gecckoStatus: "complete" | "missing" =
        profile?.geccko_completion_date ? "complete" : "missing";

      // Determine overall status
      const allStatuses = [
        wwccStatus,
        firstAidStatus,
        cprStatus,
        anaphylaxisStatus,
        asthmaStatus,
        mandatoryReportingStatus,
        foodSafetyStatus,
      ];
      const hasExpired =
        allStatuses.includes("expired") || allStatuses.includes("missing");
      const hasExpiring = allStatuses.includes("expiring_soon");

      if (hasExpired || gecckoStatus === "missing") {
        nonCompliant++;
      } else if (hasExpiring) {
        expiringSoon++;
      } else {
        fullyCompliant++;
      }

      // ECT ratio tracking
      const qual = profile?.highest_qualification;
      if (qual === "ect") {
        ectCount++;
      }
      if (qual === "diploma" || qual === "ect" || qual === "other") {
        diplomaOrHigher++;
      }

      return {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
        profile,
        certificates: certs,
        wwcc_status: wwccStatus,
        first_aid_status: firstAidStatus,
        cpr_status: cprStatus,
        anaphylaxis_status: anaphylaxisStatus,
        asthma_status: asthmaStatus,
        mandatory_reporting_status: mandatoryReportingStatus,
        food_safety_status: foodSafetyStatus,
        geccko_status: gecckoStatus,
      };
    });

    // 6. ECT ratio: configurable children-per-educator (default 60).
    const childCount = enrolledCount ?? 0;
    const childrenPerEct = settings.ect_children_per_educator;
    const requiredEct = Math.max(1, Math.ceil(childCount / childrenPerEct));

    // 7. Qualification ratio: configurable target (default 50%).
    const qualTargetPct = settings.qualification_target_pct;
    const qualPct =
      activeStaff.length > 0
        ? Math.round((diplomaOrHigher / activeStaff.length) * 100)
        : 100;

    return success({
      staff: summaries,
      stats: {
        total_staff: activeStaff.length,
        fully_compliant: fullyCompliant,
        expiring_soon: expiringSoon,
        non_compliant: nonCompliant,
      },
      ect_ratio: {
        enrolled_children: childCount,
        ect_staff_count: ectCount,
        required_ect_count: requiredEct,
        is_met: ectCount >= requiredEct,
      },
      qualification_ratio: {
        total_active_staff: activeStaff.length,
        diploma_or_higher_count: diplomaOrHigher,
        percentage: qualPct,
        is_met: activeStaff.length === 0 || qualPct >= qualTargetPct,
      },
    });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to load compliance dashboard";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// READ: Staff Compliance Detail
// ============================================================

export interface StaffComplianceDetailData {
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  profile: StaffComplianceProfile | null;
  certificates: StaffCertificate[];
  statuses: {
    wwcc: ComplianceItemStatus;
    first_aid: ComplianceItemStatus;
    cpr: ComplianceItemStatus;
    anaphylaxis: ComplianceItemStatus;
    asthma: ComplianceItemStatus;
    food_safety: ComplianceItemStatus;
    geccko: "complete" | "missing";
  };
  expiry_details: Array<{
    label: string;
    expires_at: string | null;
    days_remaining: number | null;
    status: ComplianceItemStatus;
  }>;
}

export async function getStaffComplianceDetail(
  userId: string,
): Promise<ActionResponse<StaffComplianceDetailData>> {
  try {
    const context = await requirePermission(Permissions.VIEW_STAFF_COMPLIANCE);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;
    const today = new Date();

    // Verify user is in this tenant
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, avatar_url")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return failure("Staff member not found", ErrorCodes.NOT_FOUND);
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (!membership) {
      return failure(
        "Staff member not found in this school",
        ErrorCodes.NOT_FOUND,
      );
    }

    // Get compliance profile
    const { data: profile } = await supabase
      .from("staff_compliance_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    // Get certificates
    const { data: certificates } = await supabase
      .from("staff_certificates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("expiry_date", { ascending: true });

    const certs = (certificates ?? []) as StaffCertificate[];
    const profileData = (profile as StaffComplianceProfile) ?? null;

    // Compute statuses
    const wwccStatus = computeItemStatus(
      profileData?.wwcc_expiry ?? null,
      today,
    );
    const firstAidStatus = certStatusForType(certs, "first_aid", today);
    const cprStatus = certStatusForType(certs, "cpr", today);
    const anaphylaxisStatus = certStatusForType(certs, "anaphylaxis", today);
    const asthmaStatus = certStatusForType(certs, "asthma", today);
    const foodSafetyStatus = certStatusForType(certs, "food_safety", today);
    const gecckoStatus: "complete" | "missing" =
      profileData?.geccko_completion_date ? "complete" : "missing";

    // Build expiry details for all tracked items
    const expiryDetails: StaffComplianceDetailData["expiry_details"] = [
      {
        label: "WWCC",
        expires_at: profileData?.wwcc_expiry ?? null,
        days_remaining: daysUntilExpiry(
          profileData?.wwcc_expiry ?? null,
          today,
        ),
        status: wwccStatus,
      },
    ];

    for (const type of MANDATORY_CERT_TYPES) {
      const cert = latestCertOfType(certs, type);
      const label =
        type === "first_aid"
          ? "First Aid (HLTAID012)"
          : type === "cpr"
            ? "CPR"
            : type === "anaphylaxis"
              ? "Anaphylaxis Management"
              : type === "asthma"
                ? "Asthma Management"
                : type === "child_safety"
                  ? "Child Safety (Geccko)"
                  : type === "food_safety"
                    ? "Food Safety Supervisor"
                    : type;
      expiryDetails.push({
        label,
        expires_at: cert?.expiry_date ?? null,
        days_remaining: daysUntilExpiry(cert?.expiry_date ?? null, today),
        status: certStatusForType(certs, type, today),
      });
    }

    return success({
      user,
      profile: profileData,
      certificates: certs,
      statuses: {
        wwcc: wwccStatus,
        first_aid: firstAidStatus,
        cpr: cprStatus,
        anaphylaxis: anaphylaxisStatus,
        asthma: asthmaStatus,
        food_safety: foodSafetyStatus,
        geccko: gecckoStatus,
      },
      expiry_details: expiryDetails,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to load compliance detail";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// READ: Expiring Items
// ============================================================

export interface ExpiringItem {
  user_id: string;
  user_name: string;
  item_type: string;
  label: string;
  expires_at: string;
  days_remaining: number;
}

export async function getExpiringItems(
  withinDays?: number,
): Promise<ActionResponse<ExpiringItem[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_STAFF_COMPLIANCE);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;
    const today = new Date();

    // Use configured warning days if no explicit value provided
    const effectiveDays =
      withinDays ??
      (await readComplianceSettings(supabase, tenantId)).expiry_warning_days;
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + effectiveDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const items: ExpiringItem[] = [];

    // 1. Expiring WWCC
    const { data: wwccExpiring } = await supabase
      .from("staff_compliance_profiles")
      .select("user_id, wwcc_expiry, users!inner(first_name, last_name)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .not("wwcc_expiry", "is", null)
      .lte("wwcc_expiry", cutoffStr);

    for (const row of wwccExpiring ?? []) {
      const rawU = row.users as unknown as
        | { first_name: string | null; last_name: string | null }
        | { first_name: string | null; last_name: string | null }[];
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      const days = daysUntilExpiry(row.wwcc_expiry, today);
      if (days !== null) {
        items.push({
          user_id: row.user_id,
          user_name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
          item_type: "wwcc",
          label: "Working with Children Check",
          expires_at: row.wwcc_expiry!,
          days_remaining: days,
        });
      }
    }

    // 2. Expiring certificates
    const { data: certsExpiring } = await supabase
      .from("staff_certificates")
      .select(
        "user_id, cert_type, cert_name, expiry_date, users!inner(first_name, last_name)",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .not("expiry_date", "is", null)
      .lte("expiry_date", cutoffStr);

    for (const row of certsExpiring ?? []) {
      const rawU = row.users as unknown as
        | { first_name: string | null; last_name: string | null }
        | { first_name: string | null; last_name: string | null }[];
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      const days = daysUntilExpiry(row.expiry_date, today);
      if (days !== null) {
        items.push({
          user_id: row.user_id,
          user_name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
          item_type: row.cert_type,
          label: row.cert_name,
          expires_at: row.expiry_date!,
          days_remaining: days,
        });
      }
    }

    // Sort by days remaining (most urgent first)
    items.sort((a, b) => a.days_remaining - b.days_remaining);

    return success(items);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to load expiring items";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WRITE: Upsert Compliance Profile
// ============================================================

export async function upsertComplianceProfile(
  userId: string,
  input: UpsertComplianceProfileInput,
): Promise<ActionResponse<StaffComplianceProfile>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = upsertComplianceProfileSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data: profile, error } = await supabase
      .from("staff_compliance_profiles")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          ...parsed.data,
        },
        { onConflict: "tenant_id,user_id" },
      )
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.COMPLIANCE_PROFILE_UPDATED,
      entityType: "staff_compliance_profile",
      entityId: profile.id,
      metadata: { user_id: userId, fields_updated: Object.keys(parsed.data) },
    });

    return success(profile as StaffComplianceProfile);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to update compliance profile";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WRITE: Verify WWCC
// ============================================================

export async function verifyWwcc(
  userId: string,
): Promise<ActionResponse<StaffComplianceProfile>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const todayStr = new Date().toISOString().split("T")[0];

    const { data: profile, error } = await supabase
      .from("staff_compliance_profiles")
      .update({
        wwcc_last_verified: todayStr,
        wwcc_verified_by: context.user.id,
      })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error || !profile) {
      return failure(
        "Compliance profile not found. Save the WWCC details first.",
        ErrorCodes.NOT_FOUND,
      );
    }

    await logAudit({
      context,
      action: AuditActions.WWCC_VERIFIED,
      entityType: "staff_compliance_profile",
      entityId: profile.id,
      metadata: { user_id: userId, verified_date: todayStr },
    });

    return success(profile as StaffComplianceProfile);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to verify WWCC";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WRITE: Upsert Certificate
// ============================================================

export async function upsertCertificate(
  input: UpsertCertificateInput,
): Promise<ActionResponse<StaffCertificate>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = upsertCertificateSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { id, user_id, ...fields } = parsed.data;
    const isUpdate = !!id;

    let result;
    if (isUpdate) {
      const { data, error } = await supabase
        .from("staff_certificates")
        .update(fields)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .select("*")
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabase
        .from("staff_certificates")
        .insert({
          tenant_id: tenantId,
          user_id,
          ...fields,
        })
        .select("*")
        .single();
      result = { data, error };
    }

    if (result.error || !result.data) {
      return failure(
        result.error?.message ?? "Failed to save certificate",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    await logAudit({
      context,
      action: isUpdate
        ? AuditActions.CERTIFICATE_UPDATED
        : AuditActions.CERTIFICATE_ADDED,
      entityType: "staff_certificate",
      entityId: result.data.id,
      metadata: {
        user_id,
        cert_type: fields.cert_type,
        cert_name: fields.cert_name,
      },
    });

    return success(result.data as StaffCertificate);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to save certificate";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WRITE: Delete Certificate (soft)
// ============================================================

export async function deleteCertificate(
  certId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const { data: cert, error } = await supabase
      .from("staff_certificates")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", certId)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .select("id, user_id, cert_type, cert_name")
      .single();

    if (error || !cert) {
      return failure("Certificate not found", ErrorCodes.NOT_FOUND);
    }

    await logAudit({
      context,
      action: AuditActions.CERTIFICATE_DELETED,
      entityType: "staff_certificate",
      entityId: certId,
      metadata: {
        user_id: cert.user_id,
        cert_type: cert.cert_type,
        cert_name: cert.cert_name,
      },
    });

    return success({ id: certId });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to delete certificate";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// VALIDATE: Worker Register Pre-flight Check
// ============================================================

export interface WorkerRegisterValidationResult {
  total_staff: number;
  complete_count: number;
  incomplete_count: number;
  incomplete_staff: Array<{
    user_id: string;
    user_name: string;
    missing_fields: string[];
  }>;
}

const WORKER_REGISTER_REQUIRED_FIELDS: Array<{
  key: string;
  label: string;
  source: "user" | "profile";
}> = [
  { key: "first_name", label: "First Name", source: "user" },
  { key: "last_name", label: "Last Name", source: "user" },
  { key: "date_of_birth", label: "Date of Birth", source: "profile" },
  { key: "contact_address", label: "Contact Address", source: "profile" },
  { key: "position_title", label: "Position Title", source: "profile" },
  {
    key: "employment_start_date",
    label: "Employment Start",
    source: "profile",
  },
  { key: "wwcc_number", label: "WWCC Number", source: "profile" },
  { key: "wwcc_state", label: "WWCC State", source: "profile" },
];

export async function validateWorkerRegister(): Promise<
  ActionResponse<WorkerRegisterValidationResult>
> {
  try {
    const context = await requirePermission(Permissions.EXPORT_WORKER_REGISTER);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const { data: staffRows } = await supabase
      .from("tenant_users")
      .select(
        `
        user_id,
        users!inner(first_name, last_name)
      `,
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const userIds = (staffRows ?? []).map((r) => r.user_id);

    const { data: profiles } = await supabase
      .from("staff_compliance_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("user_id", userIds)
      .is("deleted_at", null);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const incompleteStaff: WorkerRegisterValidationResult["incomplete_staff"] =
      [];

    for (const row of staffRows ?? []) {
      const rawU = row.users as unknown as
        | { first_name: string | null; last_name: string | null }
        | Array<{ first_name: string | null; last_name: string | null }>;
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      const p = profileMap.get(row.user_id);

      const missing: string[] = [];
      for (const field of WORKER_REGISTER_REQUIRED_FIELDS) {
        if (field.source === "user") {
          const val = (u as Record<string, unknown>)[field.key];
          if (!val || (typeof val === "string" && !val.trim())) {
            missing.push(field.label);
          }
        } else {
          const val = p ? (p as Record<string, unknown>)[field.key] : null;
          if (!val || (typeof val === "string" && !val.trim())) {
            missing.push(field.label);
          }
        }
      }

      if (missing.length > 0) {
        const name =
          `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unknown";
        incompleteStaff.push({
          user_id: row.user_id,
          user_name: name,
          missing_fields: missing,
        });
      }
    }

    return success({
      total_staff: userIds.length,
      complete_count: userIds.length - incompleteStaff.length,
      incomplete_count: incompleteStaff.length,
      incomplete_staff: incompleteStaff,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to validate worker register";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// EXPORT: Worker Register (NQA ITS CSV)
// ============================================================

export interface WorkerRegisterRow {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  contact_address: string;
  position_title: string;
  employment_start_date: string;
  employment_end_date: string;
  highest_qualification: string;
  wwcc_number: string;
  wwcc_state: string;
  wwcc_expiry: string;
}

export async function exportWorkerRegister(): Promise<
  ActionResponse<{ csv: string; filename: string; row_count: number }>
> {
  try {
    const context = await requirePermission(Permissions.EXPORT_WORKER_REGISTER);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Get all staff with compliance profiles
    const { data: staffRows } = await supabase
      .from("tenant_users")
      .select(
        `
        user_id,
        users!inner(first_name, last_name)
      `,
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const userIds = (staffRows ?? []).map((r) => r.user_id);

    const { data: profiles } = await supabase
      .from("staff_compliance_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("user_id", userIds)
      .is("deleted_at", null);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const rows: WorkerRegisterRow[] = (staffRows ?? []).map((row) => {
      const rawU = row.users as unknown as
        | { first_name: string | null; last_name: string | null }
        | Array<{ first_name: string | null; last_name: string | null }>;
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      const p = profileMap.get(row.user_id);
      return {
        first_name: u.first_name ?? "",
        last_name: u.last_name ?? "",
        date_of_birth: p?.date_of_birth ?? "",
        contact_address: p?.contact_address ?? "",
        position_title: p?.position_title ?? "",
        employment_start_date: p?.employment_start_date ?? "",
        employment_end_date: p?.employment_end_date ?? "",
        highest_qualification: p?.highest_qualification ?? "",
        wwcc_number: p?.wwcc_number ?? "",
        wwcc_state: p?.wwcc_state ?? "",
        wwcc_expiry: p?.wwcc_expiry ?? "",
      };
    });

    // Build CSV
    const headers = [
      "First Name",
      "Last Name",
      "Date of Birth",
      "Contact Address",
      "Position",
      "Employment Start",
      "Employment End",
      "Highest Qualification",
      "WWCC Number",
      "WWCC State",
      "WWCC Expiry",
    ];

    const escCsv = (val: string): string => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.first_name,
          r.last_name,
          r.date_of_birth,
          r.contact_address,
          r.position_title,
          r.employment_start_date,
          r.employment_end_date,
          r.highest_qualification,
          r.wwcc_number,
          r.wwcc_state,
          r.wwcc_expiry,
        ]
          .map(escCsv)
          .join(","),
      ),
    ];

    const csv = csvLines.join("\n");
    const today = new Date().toISOString().split("T")[0];
    const filename = `worker-register-${context.tenant.slug ?? "export"}-${today}.csv`;

    await logAudit({
      context,
      action: AuditActions.WORKER_REGISTER_EXPORTED,
      entityType: "worker_register",
      entityId: null,
      metadata: { row_count: rows.length, filename },
    });

    return success({ csv, filename, row_count: rows.length });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to export worker register";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// READ: Compliance Settings
// ============================================================

export async function getComplianceSettings(): Promise<
  ActionResponse<ComplianceSettings>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_STAFF_COMPLIANCE);
    const supabase = await createSupabaseServerClient();
    const settings = await readComplianceSettings(supabase, context.tenant.id);
    return success(settings);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to load compliance settings";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WRITE: Update Compliance Settings
// ============================================================

export async function updateComplianceSettings(
  input: UpdateComplianceSettingsInput,
): Promise<ActionResponse<ComplianceSettings>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = updateComplianceSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Read current settings JSONB, merge compliance key
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    const currentSettings = (tenant?.settings as Record<string, unknown>) ?? {};
    const newSettings = { ...currentSettings, compliance: parsed.data };

    const { error } = await supabase
      .from("tenants")
      .update({ settings: newSettings })
      .eq("id", tenantId);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.COMPLIANCE_PROFILE_UPDATED,
      entityType: "compliance_settings",
      entityId: tenantId,
      metadata: { settings: parsed.data },
    });

    return success(parsed.data as ComplianceSettings);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to update compliance settings";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ACTION: Send Expiry Alerts to Nominated Supervisor
// ============================================================

export interface ExpiryAlertResult {
  items_flagged: number;
  alert_sent_to: string | null;
}

export async function sendExpiryAlerts(): Promise<
  ActionResponse<ExpiryAlertResult>
> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const settings = await readComplianceSettings(supabase, tenantId);

    if (!settings.nominated_supervisor_id) {
      return failure(
        "No nominated supervisor configured. Go to Compliance Settings to set one.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Get expiring items
    const expiringResult = await getExpiringItems(settings.expiry_warning_days);
    const items = expiringResult.data ?? [];

    if (items.length === 0) {
      return success({ items_flagged: 0, alert_sent_to: null });
    }

    // Build announcement content
    const lines = items.map(
      (item) =>
        `- **${item.user_name}**: ${item.label} - ${
          item.days_remaining <= 0
            ? "EXPIRED"
            : `${item.days_remaining} days remaining`
        }`,
    );

    const body = [
      `**Staff Compliance Alert**`,
      ``,
      `${items.length} item${items.length !== 1 ? "s" : ""} require attention (within ${settings.expiry_warning_days} days):`,
      ``,
      ...lines,
      ``,
      `View the [Staff Compliance Dashboard](/admin/staff-compliance) to take action.`,
    ].join("\n");

    // Create announcement via the announcements table
    const { error: announceError } = await supabase
      .from("announcements")
      .insert({
        tenant_id: tenantId,
        author_id: context.user.id,
        title: `Staff Compliance: ${items.length} item${items.length !== 1 ? "s" : ""} expiring`,
        body,
        audience: "staff",
        priority: "high",
        is_published: true,
        published_at: new Date().toISOString(),
      });

    if (announceError) {
      return failure(
        `Alert items identified but announcement failed: ${announceError.message}`,
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Get supervisor name for response
    const { data: supervisor } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", settings.nominated_supervisor_id)
      .single();

    const supervisorName = supervisor
      ? `${supervisor.first_name ?? ""} ${supervisor.last_name ?? ""}`.trim()
      : settings.nominated_supervisor_id;

    await logAudit({
      context,
      action: AuditActions.EXPIRY_ALERTS_SENT,
      entityType: "compliance_alert",
      entityId: null,
      metadata: {
        items_flagged: items.length,
        nominated_supervisor_id: settings.nominated_supervisor_id,
        warning_days: settings.expiry_warning_days,
      },
    });

    return success({
      items_flagged: items.length,
      alert_sent_to: supervisorName,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to send expiry alerts";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// IMPORT: Bulk Certificate Import
// ============================================================

export interface BulkImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export async function importCertificatesBulk(
  input: BulkCertificateImportInput,
): Promise<ActionResponse<BulkImportResult>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_STAFF_COMPLIANCE,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = bulkCertificateImportSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Resolve emails to user IDs within this tenant
    const emails = [...new Set(parsed.data.rows.map((r) => r.user_email))];
    const { data: userRows } = await supabase
      .from("tenant_users")
      .select("user_id, users!inner(email)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const emailToUserId = new Map<string, string>();
    for (const row of userRows ?? []) {
      const rawU = row.users as unknown as
        | { email: string }
        | Array<{ email: string }>;
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      emailToUserId.set(u.email.toLowerCase(), row.user_id);
    }

    const errors: BulkImportResult["errors"] = [];
    const validInserts: Array<{
      tenant_id: string;
      user_id: string;
      cert_type: string;
      cert_name: string;
      issue_date: string;
      expiry_date: string | null;
      cert_number: string | null;
      provider: string | null;
    }> = [];

    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i];
      const userId = emailToUserId.get(row.user_email.toLowerCase());

      if (!userId) {
        errors.push({
          row: i + 1,
          message: `Staff member not found: ${row.user_email}`,
        });
        continue;
      }

      validInserts.push({
        tenant_id: tenantId,
        user_id: userId,
        cert_type: row.cert_type,
        cert_name: row.cert_name,
        issue_date: row.issue_date,
        expiry_date: row.expiry_date,
        cert_number: row.cert_number,
        provider: row.provider,
      });
    }

    let imported = 0;
    if (validInserts.length > 0) {
      const { error: insertError, count } = await supabase
        .from("staff_certificates")
        .insert(validInserts);

      if (insertError) {
        return failure(
          `Database insert failed: ${insertError.message}`,
          ErrorCodes.DATABASE_ERROR,
        );
      }

      imported = validInserts.length;
    }

    await logAudit({
      context,
      action: AuditActions.CERTIFICATES_BULK_IMPORTED,
      entityType: "staff_certificate",
      entityId: null,
      metadata: {
        total_rows: parsed.data.rows.length,
        imported,
        errors_count: errors.length,
      },
    });

    return success({ imported, errors });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to import certificates";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}
