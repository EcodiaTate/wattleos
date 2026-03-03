"use server";

// src/lib/actions/reports/instances.ts
//
// ============================================================
// WattleOS V2 - PLG Report Instances Server Actions
// ============================================================
// Manages individual report instances:
//   - Guide view: list assigned instances, autosave drafts, submit
//   - Admin view: review, request changes, approve, bulk-approve, publish
//   - PDF generation on publish
//
// Plan-tier enforcement:
//   - Saving a paid-tier section (mastery_summary, observation_highlights)
//     → returns PLAN_LIMIT error on free tier
//
// Champion Mechanic: trackPLGFeatureUse() is called on every
// meaningful engagement to detect multi-user adoption.
// ============================================================

import {
  renderReportPdf,
  generateReportStoragePath,
} from "@/lib/integrations/pdf/client";
import type { ReportContent } from "@/lib/integrations/pdf/client";
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
import type {
  ReportInstance,
  ReportInstanceStatus,
  ReportInstanceSectionResponse,
  ReportInstanceWithContext,
} from "@/types/domain";
import { logAudit } from "@/lib/utils/audit";
import { isFeatureEnabled, isSectionTypePaid } from "@/lib/plg/plan-gating";
import { trackPLGFeatureUse } from "@/lib/plg/champion-mechanic";

// ============================================================
// Input Types
// ============================================================

export interface SaveInstanceDraftInput {
  section_id: string;
  content: string;
  /** The section type - used to check paid-tier gate */
  section_type: string;
}

export interface RequestChangesInput {
  notes: string;
}

// ============================================================
// LIST MY INSTANCES (Guide View)
// ============================================================
// Shows all instances assigned to the current user, optionally
// filtered by period. Used for the /reports/my-reports page.

export async function listMyInstances(params?: {
  period_id?: string;
  status?: ReportInstanceStatus;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ReportInstanceWithContext>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 50;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("report_instances")
      .select(
        `
        *,
        period:report_periods(name, due_at),
        template:report_templates(name)
      `,
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .eq("assigned_guide_id", context.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (params?.period_id) {
      query = query.eq("report_period_id", params.period_id);
    }
    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, count, error } = await query;
    if (error) return paginatedFailure(error.message);

    const rows: ReportInstanceWithContext[] = (data ?? []).map((row) => {
      const period = Array.isArray(row.period) ? row.period[0] : row.period;
      const template = Array.isArray(row.template)
        ? row.template[0]
        : row.template;
      return {
        ...row,
        section_responses: (row.section_responses ??
          []) as ReportInstanceSectionResponse[],
        period_name: period?.name ?? "Unknown Period",
        period_due_at: period?.due_at ?? null,
        template_name: template?.name ?? null,
      };
    });

    return paginated(rows, count ?? 0, page, perPage);
  } catch {
    return paginatedFailure("Failed to list report instances.");
  }
}

// ============================================================
// LIST INSTANCES FOR A PERIOD (Admin View)
// ============================================================

export async function listPeriodInstances(
  periodId: string,
  params?: {
    status?: ReportInstanceStatus;
    guide_id?: string;
    page?: number;
    per_page?: number;
  },
): Promise<PaginatedResponse<ReportInstance>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 50;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("report_instances")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .eq("report_period_id", periodId)
      .is("deleted_at", null)
      .order("student_last_name", { ascending: true })
      .order("student_first_name", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params?.status) query = query.eq("status", params.status);
    if (params?.guide_id)
      query = query.eq("assigned_guide_id", params.guide_id);

    const { data, count, error } = await query;
    if (error) return paginatedFailure(error.message);

    return paginated(
      (data ?? []).map((row) => ({
        ...row,
        section_responses: (row.section_responses ??
          []) as ReportInstanceSectionResponse[],
      })),
      count ?? 0,
      page,
      perPage,
    );
  } catch {
    return paginatedFailure("Failed to list period instances.");
  }
}

// ============================================================
// GET INSTANCE
// ============================================================

export async function getReportInstance(
  instanceId: string,
): Promise<ActionResponse<ReportInstanceWithContext>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_instances")
      .select(
        `
        *,
        period:report_periods(name, due_at, status),
        template:report_templates(name, content)
      `,
      )
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message);

    // Access control: guide can only read their own, admin can read all
    const isAdmin = context.permissions.includes("manage_report_periods");
    const isOwner = data.assigned_guide_id === context.user.id;

    if (!isAdmin && !isOwner) {
      return failure(
        "You don't have access to this report.",
        ErrorCodes.FORBIDDEN,
      );
    }

    const period = Array.isArray(data.period) ? data.period[0] : data.period;
    const template = Array.isArray(data.template)
      ? data.template[0]
      : data.template;

    return success({
      ...data,
      section_responses: (data.section_responses ??
        []) as ReportInstanceSectionResponse[],
      period_name: period?.name ?? "Unknown Period",
      period_due_at: period?.due_at ?? null,
      template_name: template?.name ?? null,
    });
  } catch {
    return failure("Failed to get report instance.");
  }
}

// ============================================================
// SAVE INSTANCE DRAFT (Autosave)
// ============================================================
// Updates a single section's content within section_responses.
// Enforces paid-tier gate for auto-populated sections.

export async function saveInstanceDraft(
  instanceId: string,
  input: SaveInstanceDraftInput,
): Promise<ActionResponse<ReportInstance>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";

    // ── Plan-tier gate for paid sections ───────────────────
    if (
      isSectionTypePaid(input.section_type) &&
      !isFeatureEnabled("report_mastery_summary_section", planTier)
    ) {
      return failure(
        "This section is only available on the Pro plan. Upgrade to auto-populate mastery and observation data.",
        ErrorCodes.PLAN_LIMIT,
      );
    }

    // Verify ownership + editable status
    const { data: existing, error: fetchError } = await supabase
      .from("report_instances")
      .select("id, assigned_guide_id, status, section_responses, tenant_id")
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchError) return failure(fetchError.message);

    const isAdmin = context.permissions.includes("manage_report_periods");
    const isOwner = existing.assigned_guide_id === context.user.id;

    if (!isAdmin && !isOwner) {
      return failure(
        "You don't have access to this report.",
        ErrorCodes.FORBIDDEN,
      );
    }

    if (
      !["not_started", "in_progress", "changes_requested"].includes(
        existing.status,
      )
    ) {
      return failure(
        "This report has been submitted and can no longer be edited.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Merge section response
    const currentResponses =
      (existing.section_responses as ReportInstanceSectionResponse[]) ?? [];
    const now = new Date().toISOString();
    const wordCount = input.content.trim()
      ? input.content.trim().split(/\s+/).length
      : 0;

    const existingIdx = currentResponses.findIndex(
      (r) => r.section_id === input.section_id,
    );

    let updatedResponses: ReportInstanceSectionResponse[];
    if (existingIdx >= 0) {
      updatedResponses = currentResponses.map((r, i) =>
        i === existingIdx
          ? {
              ...r,
              content: input.content,
              word_count: wordCount,
              last_edited_at: now,
            }
          : r,
      );
    } else {
      updatedResponses = [
        ...currentResponses,
        {
          section_id: input.section_id,
          content: input.content,
          word_count: wordCount,
          last_edited_at: now,
        },
      ];
    }

    const newStatus =
      existing.status === "not_started" ? "in_progress" : existing.status;

    const { data, error } = await supabase
      .from("report_instances")
      .update({
        section_responses: updatedResponses,
        status: newStatus,
        updated_at: now,
      })
      .eq("id", instanceId)
      .select()
      .single();

    if (error) return failure(error.message);

    // Track feature engagement for Champion Mechanic
    await trackPLGFeatureUse(context.tenant.id, context.user.id, "reports");

    return success({
      ...data,
      section_responses: (data.section_responses ??
        []) as ReportInstanceSectionResponse[],
    });
  } catch {
    return failure("Failed to save draft.");
  }
}

// ============================================================
// SUBMIT INSTANCE
// ============================================================

export async function submitInstance(
  instanceId: string,
): Promise<ActionResponse<ReportInstance>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchError } = await supabase
      .from("report_instances")
      .select("id, assigned_guide_id, status, section_responses, tenant_id")
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchError) return failure(fetchError.message);

    const isAdmin = context.permissions.includes("manage_report_periods");
    const isOwner = existing.assigned_guide_id === context.user.id;
    if (!isAdmin && !isOwner) {
      return failure(
        "You don't have access to this report.",
        ErrorCodes.FORBIDDEN,
      );
    }

    if (
      !["not_started", "in_progress", "changes_requested"].includes(
        existing.status,
      )
    ) {
      return failure(
        "This report cannot be submitted in its current state.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("report_instances")
      .update({
        status: "submitted",
        submitted_at: now,
        submitted_by: context.user.id,
        updated_at: now,
      })
      .eq("id", instanceId)
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_instance.submitted",
      entityType: "report_instance",
      entityId: instanceId,
      metadata: { period_id: data.report_period_id },
    });

    await trackPLGFeatureUse(context.tenant.id, context.user.id, "reports");

    return success({
      ...data,
      section_responses: (data.section_responses ??
        []) as ReportInstanceSectionResponse[],
    });
  } catch {
    return failure("Failed to submit report.");
  }
}

// ============================================================
// REQUEST CHANGES (Admin)
// ============================================================

export async function requestInstanceChanges(
  instanceId: string,
  input: RequestChangesInput,
): Promise<ActionResponse<ReportInstance>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    if (!input.notes?.trim()) {
      return failure(
        "Change request notes are required.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("report_instances")
      .update({
        status: "changes_requested",
        change_request_notes: input.notes.trim(),
        reviewed_at: now,
        reviewed_by: context.user.id,
        updated_at: now,
      })
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_instance.changes_requested",
      entityType: "report_instance",
      entityId: instanceId,
      metadata: { notes: input.notes },
    });

    return success({
      ...data,
      section_responses: (data.section_responses ??
        []) as ReportInstanceSectionResponse[],
    });
  } catch {
    return failure("Failed to request changes.");
  }
}

// ============================================================
// APPROVE INSTANCE (Admin)
// ============================================================

export async function approveInstance(
  instanceId: string,
): Promise<ActionResponse<ReportInstance>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("report_instances")
      .update({
        status: "approved",
        approved_at: now,
        approved_by: context.user.id,
        reviewed_at: now,
        reviewed_by: context.user.id,
        updated_at: now,
      })
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_instance.approved",
      entityType: "report_instance",
      entityId: instanceId,
      metadata: { period_id: data.report_period_id },
    });

    return success({
      ...data,
      section_responses: (data.section_responses ??
        []) as ReportInstanceSectionResponse[],
    });
  } catch {
    return failure("Failed to approve report.");
  }
}

// ============================================================
// BULK APPROVE INSTANCES (Admin)
// ============================================================

export async function bulkApproveInstances(
  instanceIds: string[],
): Promise<ActionResponse<{ approved: number }>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    if (!instanceIds.length) {
      return failure("No instance IDs provided.", ErrorCodes.VALIDATION_ERROR);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("report_instances")
      .update({
        status: "approved",
        approved_at: now,
        approved_by: context.user.id,
        reviewed_at: now,
        reviewed_by: context.user.id,
        updated_at: now,
      })
      .in("id", instanceIds)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .select("id");

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_instance.bulk_approved",
      entityType: "report_instance",
      entityId: null,
      metadata: { count: data?.length ?? 0 },
    });

    return success({ approved: data?.length ?? 0 });
  } catch {
    return failure("Failed to bulk approve reports.");
  }
}

// ============================================================
// ASSIGN GUIDE (Admin)
// ============================================================

export async function assignInstanceGuide(
  instanceId: string,
  guideId: string,
  guideName: string,
): Promise<ActionResponse<ReportInstance>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_instances")
      .update({
        assigned_guide_id: guideId,
        assigned_guide_name: guideName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);

    return success({
      ...data,
      section_responses: (data.section_responses ??
        []) as ReportInstanceSectionResponse[],
    });
  } catch {
    return failure("Failed to assign guide.");
  }
}

// ============================================================
// COUNT GUIDE SUBMISSIONS (for upsell trigger)
// ============================================================
// Returns how many instances the current user has submitted
// across all periods. Used to trigger the 5th-narrative upsell.

export async function countMySubmissions(): Promise<ActionResponse<number>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from("report_instances")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("assigned_guide_id", context.user.id)
      .in("status", ["submitted", "approved", "published"])
      .is("deleted_at", null);

    if (error) return failure(error.message);
    return success(count ?? 0);
  } catch {
    return failure("Failed to count submissions.");
  }
}

// ============================================================
// PUBLISH INSTANCE (Admin)
// ============================================================
// Transitions an approved instance to 'published'.
// Triggers PDF generation + upload to Supabase Storage.
// Returns the signed download URL.

export async function publishInstance(
  instanceId: string,
): Promise<ActionResponse<{ pdf_url: string; pdf_path: string }>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    // Fetch instance with period + template for PDF content
    const { data, error: fetchError } = await supabase
      .from("report_instances")
      .select(
        `
        *,
        period:report_periods(name, term, academic_year),
        template:report_templates(name)
      `,
      )
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "approved")
      .is("deleted_at", null)
      .single();

    if (fetchError || !data) {
      return failure(
        "Instance not found or not in approved state.",
        ErrorCodes.NOT_FOUND,
      );
    }

    const period = Array.isArray(data.period) ? data.period[0] : data.period;
    const template = Array.isArray(data.template)
      ? data.template[0]
      : data.template;

    // Build ReportContent from section_responses JSONB
    const responses = (data.section_responses ??
      []) as ReportInstanceSectionResponse[];
    const narrativeSection = responses.find((r) =>
      r.section_id?.startsWith("narrative"),
    );
    const combinedNarrative = responses
      .filter((r) => r.content?.trim())
      .map((r) => r.content)
      .join("\n\n");

    const studentName =
      [
        data.student_preferred_name ?? data.student_first_name,
        data.student_last_name,
      ]
        .filter(Boolean)
        .join(" ") || "Student";

    const termLabel =
      (period?.term ?? String(period?.academic_year ?? "")) || "Report";

    const reportContent: ReportContent = {
      student_name: studentName,
      class_name: data.class_name ?? undefined,
      term: termLabel,
      school_name: context.tenant.name ?? "School",
      author_name: data.assigned_guide_name ?? "Guide",
      report_date: new Date().toLocaleDateString("en-AU"),
      narrative: (narrativeSection?.content ?? combinedNarrative) || undefined,
    };

    // Render PDF
    const pdfBuffer = await renderReportPdf(reportContent);

    // Upload to Supabase Storage (path: reports/{tenant}/{studentId}/{instanceId}.pdf)
    const storagePath = generateReportStoragePath({
      tenantId: context.tenant.id,
      studentId: data.student_id ?? instanceId,
      reportId: instanceId,
    });

    const { error: uploadError } = await admin.storage
      .from("reports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return failure(`PDF upload failed: ${uploadError.message}`);
    }

    // Get signed URL (1 hour)
    const { data: urlData, error: urlError } = await admin.storage
      .from("reports")
      .createSignedUrl(storagePath, 3600);

    if (urlError || !urlData?.signedUrl) {
      return failure("PDF generated but could not create download URL.");
    }

    // Update instance to published
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("report_instances")
      .update({
        status: "published",
        pdf_storage_path: storagePath,
        published_at: now,
        updated_at: now,
      })
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id);

    if (updateError) return failure(updateError.message);

    await logAudit({
      context,
      action: "report_instance.published",
      entityType: "report_instance",
      entityId: instanceId,
      metadata: { period_id: data.report_period_id, pdf_path: storagePath },
    });

    return success({ pdf_url: urlData.signedUrl, pdf_path: storagePath });
  } catch {
    return failure("Failed to publish report.");
  }
}

// ============================================================
// GET INSTANCE PDF URL (Admin / re-download)
// ============================================================

export async function getInstancePdfUrl(
  instanceId: string,
): Promise<ActionResponse<{ download_url: string; filename: string }>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const admin = await createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_instances")
      .select(
        "pdf_storage_path, student_first_name, student_last_name, student_preferred_name",
      )
      .eq("id", instanceId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error || !data)
      return failure("Instance not found.", ErrorCodes.NOT_FOUND);

    const path = data.pdf_storage_path as string | null;
    if (!path) return failure("No PDF available. Publish the report first.");

    const { data: urlData, error: urlError } = await admin.storage
      .from("reports")
      .createSignedUrl(path, 3600);

    if (urlError || !urlData?.signedUrl)
      return failure("Could not generate download URL.");

    const name = [
      data.student_preferred_name ?? data.student_first_name,
      data.student_last_name,
    ]
      .filter(Boolean)
      .join("_");

    return success({
      download_url: urlData.signedUrl,
      filename: `${name}_Report.pdf`,
    });
  } catch {
    return failure("Failed to get PDF URL.");
  }
}

// ============================================================
// BULK PUBLISH INSTANCES (Admin)
// ============================================================

export async function bulkPublishInstances(
  instanceIds: string[],
): Promise<ActionResponse<{ published: number; errors: number }>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);

    let published = 0;
    let errors = 0;

    // Publish sequentially to avoid concurrency issues with PDF renderer
    for (const id of instanceIds) {
      const result = await publishInstance(id);
      if (result.error) errors += 1;
      else published += 1;
    }

    await logAudit({
      context,
      action: "report_instance.bulk_published",
      entityType: "report_instance",
      entityId: null,
      metadata: { count: published, errors },
    });

    return success({ published, errors });
  } catch {
    return failure("Failed to bulk publish reports.");
  }
}
