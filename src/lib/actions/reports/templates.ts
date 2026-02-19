// src/lib/actions/reports/templates.ts
//
// ============================================================
// WattleOS V2 - Report Template Server Actions
// ============================================================
// CRUD operations for report templates. Templates define the
// structure of end-of-term reports - schools compose them from
// section types (narrative, mastery grid, attendance, etc.).
//
// WHY template builder: Every Montessori school has different
// reporting requirements. Some focus on narrative, others on
// data. Rather than shipping fixed formats, we let each school
// design their own report structure.
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  TemplateContent,
  createDefaultTemplateContent,
  validateTemplateContent,
} from "@/lib/reports/types";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { ReportTemplate } from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateTemplateInput {
  name: string;
  cycleLevel?: string | null;
  content?: TemplateContent;
}

export interface UpdateTemplateInput {
  name?: string;
  cycleLevel?: string | null;
  content?: TemplateContent;
  isActive?: boolean;
}

// ============================================================
// Compound types for UI
// ============================================================

/** Template with count of reports generated from it */
export interface TemplateWithStats extends ReportTemplate {
  reportCount: number;
}

// ============================================================
// LIST REPORT TEMPLATES
// ============================================================

export async function listReportTemplates(params?: {
  cycleLevel?: string;
  activeOnly?: boolean;
}): Promise<ActionResponse<TemplateWithStats[]>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("report_templates")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (params?.cycleLevel) {
      query = query.eq("cycle_level", params.cycleLevel);
    }

    if (params?.activeOnly !== false) {
      // Default: only show active templates
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const templates = (data ?? []) as ReportTemplate[];

    // Get report counts for each template
    const templateIds = templates.map((t) => t.id);

    let reportCounts: Record<string, number> = {};
    if (templateIds.length > 0) {
      const { data: counts } = await supabase
        .from("student_reports")
        .select("template_id")
        .in("template_id", templateIds)
        .is("deleted_at", null);

      for (const row of (counts ?? []) as Array<{ template_id: string }>) {
        reportCounts[row.template_id] =
          (reportCounts[row.template_id] ?? 0) + 1;
      }
    }

    const templatesWithStats: TemplateWithStats[] = templates.map((t) => ({
      ...t,
      reportCount: reportCounts[t.id] ?? 0,
    }));

    return success(templatesWithStats);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list report templates";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// GET SINGLE REPORT TEMPLATE
// ============================================================

export async function getReportTemplate(
  templateId: string,
): Promise<ActionResponse<ReportTemplate>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_templates")
      .select("*")
      .eq("id", templateId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return failure("Report template not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as ReportTemplate);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get report template";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// CREATE REPORT TEMPLATE
// ============================================================

export async function createReportTemplate(
  input: CreateTemplateInput,
): Promise<ActionResponse<ReportTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Validation
    if (!input.name?.trim()) {
      return failure("Template name is required", ErrorCodes.VALIDATION_ERROR);
    }

    // Use provided content or generate default
    const content = input.content ?? createDefaultTemplateContent();

    if (!validateTemplateContent(content)) {
      return failure(
        "Invalid template content structure",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("report_templates")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        cycle_level: input.cycleLevel?.trim() || null,
        content: content as unknown as Record<string, unknown>,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Audit log
    const adminClient = createSupabaseAdminClient();
    await adminClient.from("audit_logs").insert({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      action: "report_template.created",
      entity_type: "report_template",
      entity_id: (data as ReportTemplate).id,
      metadata: { name: input.name },
    });

    return success(data as ReportTemplate);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create report template";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// UPDATE REPORT TEMPLATE
// ============================================================

export async function updateReportTemplate(
  templateId: string,
  input: UpdateTemplateInput,
): Promise<ActionResponse<ReportTemplate>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Build update payload - only include provided fields
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        return failure(
          "Template name cannot be empty",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      updateData.name = input.name.trim();
    }

    if (input.cycleLevel !== undefined) {
      updateData.cycle_level = input.cycleLevel?.trim() || null;
    }

    if (input.content !== undefined) {
      if (!validateTemplateContent(input.content)) {
        return failure(
          "Invalid template content structure",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      updateData.content = input.content as unknown as Record<string, unknown>;
    }

    if (input.isActive !== undefined) {
      updateData.is_active = input.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("report_templates")
      .update(updateData)
      .eq("id", templateId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      return failure("Report template not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as ReportTemplate);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update report template";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// DUPLICATE REPORT TEMPLATE
// ============================================================
// Creates a copy of an existing template with "(Copy)" appended
// to the name. Useful for schools that want to iterate on a
// template without modifying the original.

export async function duplicateReportTemplate(
  templateId: string,
): Promise<ActionResponse<ReportTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Fetch the source template
    const { data: source, error: fetchError } = await supabase
      .from("report_templates")
      .select("*")
      .eq("id", templateId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !source) {
      return failure("Source template not found", ErrorCodes.NOT_FOUND);
    }

    const sourceTemplate = source as ReportTemplate;

    // Create the duplicate
    const { data, error } = await supabase
      .from("report_templates")
      .insert({
        tenant_id: context.tenant.id,
        name: `${sourceTemplate.name} (Copy)`,
        cycle_level: sourceTemplate.cycle_level,
        content: sourceTemplate.content,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as ReportTemplate);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to duplicate report template";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// SOFT DELETE REPORT TEMPLATE
// ============================================================

export async function deleteReportTemplate(
  templateId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Check if any non-deleted reports use this template
    const { count } = await supabase
      .from("student_reports")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId)
      .is("deleted_at", null);

    if (count && count > 0) {
      return failure(
        `This template is used by ${count} report(s). Deactivate it instead, or delete the reports first.`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { error } = await supabase
      .from("report_templates")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", templateId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({ id: templateId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete report template";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}
