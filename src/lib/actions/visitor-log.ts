"use server";

// src/lib/actions/visitor-log.ts
//
// ============================================================
// WattleOS V2 - Visitor & Contractor Sign-In Log Actions
// ============================================================
// Visitor log (parent_guardian, official, delivery, etc.) and
// Contractor log (tradespersons with licence/insurance details).
//
// Both are standalone - no FK to students or attendance_records.
// signed_out_at = NULL means the person is currently on site.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  CreateVisitorSchema,
  CreateContractorSchema,
  ListVisitorsSchema,
  ListContractorsSchema,
  SignOutVisitorSchema,
  SignOutContractorSchema,
  UpdateVisitorSchema,
  UpdateContractorSchema,
  type CreateVisitorInput,
  type CreateContractorInput,
  type ListVisitorsInput,
  type ListContractorsInput,
  type SignOutVisitorInput,
  type SignOutContractorInput,
  type UpdateVisitorInput,
  type UpdateContractorInput,
} from "@/lib/validations/visitor-log";
import {
  ActionResponse,
  failure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  ContractorSignInRecord,
  VisitorLogDashboardData,
  VisitorSignInRecord,
} from "@/types/domain";

// ============================================================
// VISITORS - Create
// ============================================================

export async function createVisitorRecord(
  input: CreateVisitorInput,
): Promise<ActionResponse<VisitorSignInRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();

    const parsed = CreateVisitorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    const { data: record, error } = await supabase
      .from("visitor_sign_in_records")
      .insert({
        tenant_id: context.tenant.id,
        visitor_name: data.visitor_name,
        visitor_type: data.visitor_type,
        organisation: data.organisation ?? null,
        purpose: data.purpose,
        host_name: data.host_name ?? null,
        badge_number: data.badge_number ?? null,
        id_sighted: data.id_sighted,
        signed_in_at: data.signed_in_at,
        notes: data.notes ?? null,
        recorded_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.VISITOR_SIGNED_IN,
      entityType: "visitor_sign_in_record",
      entityId: (record as VisitorSignInRecord).id,
      metadata: {
        visitor_name: data.visitor_name,
        visitor_type: data.visitor_type,
        purpose: data.purpose,
      },
    });

    return success(record as VisitorSignInRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to record visitor",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// VISITORS - Sign-Out
// ============================================================

export async function signOutVisitor(
  input: SignOutVisitorInput,
): Promise<ActionResponse<VisitorSignInRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();

    const parsed = SignOutVisitorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    const { data: record, error } = await supabase
      .from("visitor_sign_in_records")
      .update({ signed_out_at: data.signed_out_at })
      .eq("id", data.id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.VISITOR_SIGNED_OUT,
      entityType: "visitor_sign_in_record",
      entityId: data.id,
      metadata: { signed_out_at: data.signed_out_at },
    });

    return success(record as VisitorSignInRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to sign out visitor",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// VISITORS - Update
// ============================================================

export async function updateVisitorRecord(
  input: UpdateVisitorInput,
): Promise<ActionResponse<VisitorSignInRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();

    const parsed = UpdateVisitorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const { id, ...updates } = parsed.data;

    const { data: record, error } = await supabase
      .from("visitor_sign_in_records")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.VISITOR_RECORD_UPDATED,
      entityType: "visitor_sign_in_record",
      entityId: id,
      metadata: updates,
    });

    return success(record as VisitorSignInRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update visitor record",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// VISITORS - Delete (soft)
// ============================================================

export async function deleteVisitorRecord(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("visitor_sign_in_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.VISITOR_RECORD_DELETED,
      entityType: "visitor_sign_in_record",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete visitor record",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// VISITORS - List (paginated)
// ============================================================

export async function listVisitorRecords(
  input: ListVisitorsInput,
): Promise<PaginatedResponse<VisitorSignInRecord>> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;

  try {
    const parsed = ListVisitorsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: {
          message: parsed.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
      };
    }

    await requirePermission(Permissions.VIEW_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();
    const data = parsed.data;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQ = supabase
      .from("visitor_sign_in_records")
      .select("*", { count: "exact", head: true })
      .gte("signed_in_at", `${data.startDate}T00:00:00.000Z`)
      .lte("signed_in_at", `${data.endDate}T23:59:59.999Z`)
      .is("deleted_at", null);

    let dataQ = supabase
      .from("visitor_sign_in_records")
      .select("*")
      .gte("signed_in_at", `${data.startDate}T00:00:00.000Z`)
      .lte("signed_in_at", `${data.endDate}T23:59:59.999Z`)
      .is("deleted_at", null)
      .order("signed_in_at", { ascending: false })
      .range(from, to);

    if (data.visitor_type) {
      countQ = countQ.eq("visitor_type", data.visitor_type);
      dataQ = dataQ.eq("visitor_type", data.visitor_type);
    }
    if (data.on_site_only) {
      countQ = countQ.is("signed_out_at", null);
      dataQ = dataQ.is("signed_out_at", null);
    }
    if (data.search?.trim()) {
      const term = `%${data.search.trim()}%`;
      countQ = countQ.or(
        `visitor_name.ilike.${term},purpose.ilike.${term},organisation.ilike.${term}`,
      );
      dataQ = dataQ.or(
        `visitor_name.ilike.${term},purpose.ilike.${term},organisation.ilike.${term}`,
      );
    }

    const { count, error: countError } = await countQ;
    if (countError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: countError.message, code: "DB_ERROR" },
      };
    }

    const { data: rows, error: dataError } = await dataQ;
    if (dataError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: dataError.message, code: "DB_ERROR" },
      };
    }

    return {
      data: (rows ?? []) as VisitorSignInRecord[],
      pagination: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
      error: {
        message: err instanceof Error ? err.message : "Failed to list visitors",
        code: "UNEXPECTED_ERROR",
      },
    };
  }
}

// ============================================================
// CONTRACTORS - Create
// ============================================================

export async function createContractorRecord(
  input: CreateContractorInput,
): Promise<ActionResponse<ContractorSignInRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CONTRACTOR_LOG);
    const supabase = await createSupabaseServerClient();

    const parsed = CreateContractorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    const { data: record, error } = await supabase
      .from("contractor_sign_in_records")
      .insert({
        tenant_id: context.tenant.id,
        company_name: data.company_name,
        contact_name: data.contact_name,
        trade: data.trade ?? null,
        licence_number: data.licence_number ?? null,
        insurance_number: data.insurance_number ?? null,
        insurance_expiry: data.insurance_expiry ?? null,
        induction_confirmed: data.induction_confirmed,
        wwcc_number: data.wwcc_number ?? null,
        wwcc_verified: data.wwcc_verified,
        work_location: data.work_location,
        work_description: data.work_description ?? null,
        signed_in_at: data.signed_in_at,
        notes: data.notes ?? null,
        recorded_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.CONTRACTOR_SIGNED_IN,
      entityType: "contractor_sign_in_record",
      entityId: (record as ContractorSignInRecord).id,
      metadata: {
        company_name: data.company_name,
        contact_name: data.contact_name,
        work_location: data.work_location,
      },
    });

    return success(record as ContractorSignInRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to record contractor",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// CONTRACTORS - Sign-Out
// ============================================================

export async function signOutContractor(
  input: SignOutContractorInput,
): Promise<ActionResponse<ContractorSignInRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CONTRACTOR_LOG);
    const supabase = await createSupabaseServerClient();

    const parsed = SignOutContractorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    const { data: record, error } = await supabase
      .from("contractor_sign_in_records")
      .update({ signed_out_at: data.signed_out_at })
      .eq("id", data.id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.CONTRACTOR_SIGNED_OUT,
      entityType: "contractor_sign_in_record",
      entityId: data.id,
      metadata: { signed_out_at: data.signed_out_at },
    });

    return success(record as ContractorSignInRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to sign out contractor",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// CONTRACTORS - Update
// ============================================================

export async function updateContractorRecord(
  input: UpdateContractorInput,
): Promise<ActionResponse<ContractorSignInRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CONTRACTOR_LOG);
    const supabase = await createSupabaseServerClient();

    const parsed = UpdateContractorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const { id, ...updates } = parsed.data;

    const { data: record, error } = await supabase
      .from("contractor_sign_in_records")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.CONTRACTOR_RECORD_UPDATED,
      entityType: "contractor_sign_in_record",
      entityId: id,
      metadata: updates,
    });

    return success(record as ContractorSignInRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update contractor record",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// CONTRACTORS - Delete (soft)
// ============================================================

export async function deleteContractorRecord(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CONTRACTOR_LOG);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("contractor_sign_in_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context,
      action: AuditActions.CONTRACTOR_RECORD_DELETED,
      entityType: "contractor_sign_in_record",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete contractor record",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// CONTRACTORS - List (paginated)
// ============================================================

export async function listContractorRecords(
  input: ListContractorsInput,
): Promise<PaginatedResponse<ContractorSignInRecord>> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;

  try {
    const parsed = ListContractorsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: {
          message: parsed.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
      };
    }

    await requirePermission(Permissions.VIEW_CONTRACTOR_LOG);
    const supabase = await createSupabaseServerClient();
    const data = parsed.data;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let countQ = supabase
      .from("contractor_sign_in_records")
      .select("*", { count: "exact", head: true })
      .gte("signed_in_at", `${data.startDate}T00:00:00.000Z`)
      .lte("signed_in_at", `${data.endDate}T23:59:59.999Z`)
      .is("deleted_at", null);

    let dataQ = supabase
      .from("contractor_sign_in_records")
      .select("*")
      .gte("signed_in_at", `${data.startDate}T00:00:00.000Z`)
      .lte("signed_in_at", `${data.endDate}T23:59:59.999Z`)
      .is("deleted_at", null)
      .order("signed_in_at", { ascending: false })
      .range(from, to);

    if (data.on_site_only) {
      countQ = countQ.is("signed_out_at", null);
      dataQ = dataQ.is("signed_out_at", null);
    }
    if (data.search?.trim()) {
      const term = `%${data.search.trim()}%`;
      countQ = countQ.or(
        `company_name.ilike.${term},contact_name.ilike.${term},work_location.ilike.${term}`,
      );
      dataQ = dataQ.or(
        `company_name.ilike.${term},contact_name.ilike.${term},work_location.ilike.${term}`,
      );
    }

    const { count, error: countError } = await countQ;
    if (countError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: countError.message, code: "DB_ERROR" },
      };
    }

    const { data: rows, error: dataError } = await dataQ;
    if (dataError) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: dataError.message, code: "DB_ERROR" },
      };
    }

    return {
      data: (rows ?? []) as ContractorSignInRecord[],
      pagination: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
      error: {
        message:
          err instanceof Error ? err.message : "Failed to list contractors",
        code: "UNEXPECTED_ERROR",
      },
    };
  }
}

// ============================================================
// DASHBOARD - On-site summary for a given date
// ============================================================

export async function getVisitorLogDashboard(
  date: string,
): Promise<ActionResponse<VisitorLogDashboardData>> {
  try {
    await requirePermission(Permissions.VIEW_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();

    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const [visitorsResult, contractorsResult] = await Promise.all([
      supabase
        .from("visitor_sign_in_records")
        .select("*")
        .gte("signed_in_at", dayStart)
        .lte("signed_in_at", dayEnd)
        .is("deleted_at", null)
        .order("signed_in_at", { ascending: true }),
      supabase
        .from("contractor_sign_in_records")
        .select("*")
        .gte("signed_in_at", dayStart)
        .lte("signed_in_at", dayEnd)
        .is("deleted_at", null)
        .order("signed_in_at", { ascending: true }),
    ]);

    if (visitorsResult.error)
      return failure(visitorsResult.error.message, "DB_ERROR");
    if (contractorsResult.error)
      return failure(contractorsResult.error.message, "DB_ERROR");

    const visitors = (visitorsResult.data ?? []) as VisitorSignInRecord[];
    const contractors = (contractorsResult.data ??
      []) as ContractorSignInRecord[];

    return success({
      date,
      visitors_on_site: visitors.filter((v) => v.signed_out_at === null),
      contractors_on_site: contractors.filter((c) => c.signed_out_at === null),
      total_visitors_today: visitors.length,
      total_contractors_today: contractors.length,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get dashboard",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// EXPORT - CSV for visitors or contractors over a date range
// ============================================================

export async function exportVisitorLog(
  startDate: string,
  endDate: string,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_VISITOR_LOG);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("visitor_sign_in_records")
      .select("*")
      .gte("signed_in_at", `${startDate}T00:00:00.000Z`)
      .lte("signed_in_at", `${endDate}T23:59:59.999Z`)
      .is("deleted_at", null)
      .order("signed_in_at", { ascending: true });

    if (error) return failure(error.message, "DB_ERROR");

    const esc = (val: unknown) =>
      val != null ? `"${String(val).replace(/"/g, '""')}"` : "";

    const fmt = (ts: string | null) =>
      ts
        ? new Date(ts).toLocaleString("en-AU", {
            dateStyle: "short",
            timeStyle: "short",
            hour12: true,
          })
        : "";

    const header = [
      "Sign-In Time",
      "Sign-Out Time",
      "Name",
      "Type",
      "Organisation",
      "Purpose",
      "Host",
      "Badge No.",
      "ID Sighted",
      "Notes",
    ].join(",");

    const rows = ((data ?? []) as VisitorSignInRecord[]).map((r) =>
      [
        esc(fmt(r.signed_in_at)),
        esc(r.signed_out_at ? fmt(r.signed_out_at) : "On site"),
        esc(r.visitor_name),
        esc(r.visitor_type.replace(/_/g, " ")),
        esc(r.organisation),
        esc(r.purpose),
        esc(r.host_name),
        esc(r.badge_number),
        esc(r.id_sighted ? "Yes" : "No"),
        esc(r.notes),
      ].join(","),
    );

    const csv = [header, ...rows].join("\n");

    await logAudit({
      context,
      action: AuditActions.VISITOR_LOG_EXPORTED,
      entityType: "visitor_sign_in_record",
      entityId: null,
      metadata: {
        start_date: startDate,
        end_date: endDate,
        row_count: rows.length,
      },
    });

    return success(csv);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export visitor log",
      "UNEXPECTED_ERROR",
    );
  }
}

export async function exportContractorLog(
  startDate: string,
  endDate: string,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_CONTRACTOR_LOG);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("contractor_sign_in_records")
      .select("*")
      .gte("signed_in_at", `${startDate}T00:00:00.000Z`)
      .lte("signed_in_at", `${endDate}T23:59:59.999Z`)
      .is("deleted_at", null)
      .order("signed_in_at", { ascending: true });

    if (error) return failure(error.message, "DB_ERROR");

    const esc = (val: unknown) =>
      val != null ? `"${String(val).replace(/"/g, '""')}"` : "";

    const fmt = (ts: string | null) =>
      ts
        ? new Date(ts).toLocaleString("en-AU", {
            dateStyle: "short",
            timeStyle: "short",
            hour12: true,
          })
        : "";

    const header = [
      "Sign-In Time",
      "Sign-Out Time",
      "Company",
      "Contact",
      "Trade",
      "Licence No.",
      "Insurance No.",
      "Insurance Expiry",
      "Induction",
      "WWCC No.",
      "WWCC Verified",
      "Work Location",
      "Work Description",
      "Notes",
    ].join(",");

    const rows = ((data ?? []) as ContractorSignInRecord[]).map((r) =>
      [
        esc(fmt(r.signed_in_at)),
        esc(r.signed_out_at ? fmt(r.signed_out_at) : "On site"),
        esc(r.company_name),
        esc(r.contact_name),
        esc(r.trade),
        esc(r.licence_number),
        esc(r.insurance_number),
        esc(r.insurance_expiry),
        esc(r.induction_confirmed ? "Yes" : "No"),
        esc(r.wwcc_number),
        esc(r.wwcc_verified ? "Verified" : "Not verified"),
        esc(r.work_location),
        esc(r.work_description),
        esc(r.notes),
      ].join(","),
    );

    const csv = [header, ...rows].join("\n");

    await logAudit({
      context,
      action: AuditActions.CONTRACTOR_LOG_EXPORTED,
      entityType: "contractor_sign_in_record",
      entityId: null,
      metadata: {
        start_date: startDate,
        end_date: endDate,
        row_count: rows.length,
      },
    });

    return success(csv);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export contractor log",
      "UNEXPECTED_ERROR",
    );
  }
}
