// src/app/api/reports/[reportId]/pdf/route.ts
//
// ============================================================
// WattleOS V2 - Report PDF Download Route
// ============================================================
// Returns a fresh signed URL for an exported report PDF.
// - Staff route: requires MANAGE_REPORTS permission
// - Ensures report exists + not deleted
// - Ensures PDF has been exported (pdf_storage_path set)
// - Returns a signed URL (1 hour) and a safe filename
//
// NOTE: We do NOT stream bytes here - Supabase signed URL
// is the simplest + most scalable approach.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

// Supabase/PostgREST sometimes returns joined relations as arrays.
// Normalize "object | object[] | null" into "object | null".
function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function safeFilename(studentName: string, term: string) {
  const safeName = studentName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_");
  const safeTerm = term
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_");
  return `${safeName}_${safeTerm}_Report.pdf`;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const { reportId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();

    const { data: report, error } = await supabase
      .from("student_reports")
      .select(
        `
        id, pdf_storage_path, term, status,
        student:students(first_name, last_name, preferred_name)
      `
      )
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Normalize student join (can be object or array)
    const student = firstOrNull(
      report.student as unknown as
        | { first_name: string; last_name: string; preferred_name: string | null }
        | { first_name: string; last_name: string; preferred_name: string | null }[]
        | null
    );

    const pdfPath = (report as any).pdf_storage_path as string | null | undefined;
    if (!pdfPath) {
      return NextResponse.json(
        { error: "PDF not available. Export the report first." },
        { status: 404 }
      );
    }

    // Signed URL (1 hour)
    const { data: signed, error: signedErr } = await admin.storage
      .from("reports")
      .createSignedUrl(pdfPath, 3600);

    if (signedErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create download URL" },
        { status: 500 }
      );
    }

    const studentName = student
      ? `${student.preferred_name ?? student.first_name} ${student.last_name}`
      : "Student";
    const term = ((report as any).term as string | null) ?? "Report";
    const filename = safeFilename(studentName, term);

    // Option A (best UX): redirect browser straight to the signed URL.
    // You can still read filename from a header if you want.
    return NextResponse.redirect(signed.signedUrl, {
      headers: {
        "x-wattle-filename": filename,
      },
    });

    // Option B (API style): return JSON instead of redirect.
    // return NextResponse.json({ download_url: signed.signedUrl, filename });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get PDF URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
