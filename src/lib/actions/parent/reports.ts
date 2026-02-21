'use server';

// src/lib/actions/parent/reports.ts
//
// ============================================================
// WattleOS V2 - Parent Portal: Reports Actions
// ============================================================
// Fetches published student reports for a parent's child.
// Read-only - parents view the same data teachers produced,
// but cannot edit content or change status.
//
// WHY use RLS + app guard: The student_reports table already
// has "Parents can view published reports" RLS policy. We add
// application-layer guardian check for defense in depth.
// ============================================================

"use server";

import { getTenantContext } from "@/lib/auth/tenant-context";
import type { ReportContent } from "@/lib/reports/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { isGuardianOf } from "./children";

// ============================================================
// Types
// ============================================================

export interface ParentReportSummary {
  id: string;
  term: string | null;
  templateName: string | null;
  publishedAt: string | null;
  authorName: string;
}

export interface ParentReportDetail {
  id: string;
  term: string | null;
  templateName: string | null;
  publishedAt: string | null;
  authorName: string;
  content: ReportContent;
}

// ============================================================
// getChildReports - list of published reports for a child
// ============================================================

export async function getChildReports(
  studentId: string,
): Promise<ActionResponse<ParentReportSummary[]>> {
  try {
    const context = await getTenantContext();

    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return {
        data: null,
        error: { message: "Not authorized", code: "FORBIDDEN" },
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_reports")
      .select(
        `
        id,
        term,
        published_at,
        template:report_templates(name),
        author:users!student_reports_author_id_fkey(first_name, last_name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: "QUERY_ERROR" },
      };
    }

    const reports: ParentReportSummary[] = (data ?? []).map((r) => {
      const template = r.template as unknown as { name: string } | null;
      const author = r.author as unknown as {
        first_name: string | null;
        last_name: string | null;
      } | null;
      return {
        id: r.id,
        term: r.term,
        templateName: template?.name ?? null,
        publishedAt: r.published_at,
        authorName:
          [author?.first_name, author?.last_name].filter(Boolean).join(" ") ||
          "Teacher",
      };
    });

    return { data: reports, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}

// ============================================================
// getChildReport - single published report with full content
// ============================================================

export async function getChildReport(
  reportId: string,
  studentId: string,
): Promise<ActionResponse<ParentReportDetail>> {
  try {
    const context = await getTenantContext();

    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return {
        data: null,
        error: { message: "Not authorized", code: "FORBIDDEN" },
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_reports")
      .select(
        `
        id,
        term,
        content,
        published_at,
        template:report_templates(name),
        author:users!student_reports_author_id_fkey(first_name, last_name)
      `,
      )
      .eq("id", reportId)
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return {
        data: null,
        error: { message: "Report not found", code: "NOT_FOUND" },
      };
    }

    const template = data.template as unknown as { name: string } | null;
    const author = data.author as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;

    return {
      data: {
        id: data.id,
        term: data.term,
        templateName: template?.name ?? null,
        publishedAt: data.published_at,
        authorName:
          [author?.first_name, author?.last_name].filter(Boolean).join(" ") ||
          "Teacher",
        content: data.content as unknown as ReportContent,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}
