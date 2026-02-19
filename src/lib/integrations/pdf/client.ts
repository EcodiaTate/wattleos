// src/lib/integrations/pdf/client.ts
//
// ============================================================
// WattleOS V2 - PDF Generation Client
// ============================================================
// Thin wrapper around @react-pdf/renderer that converts a
// ReportContent object into a PDF Buffer.
//
// WHY isolated: Keeps the heavy @react-pdf dependency in one
// place. If we ever switch to puppeteer/wkhtmltopdf/etc., only
// this file changes.
// ============================================================

import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import type { ReportContent } from "./report-renderer";
import { ReportDocument } from "./report-renderer";

export type { ReportContent };

/**
 * Renders a student report to a PDF buffer.
 *
 * @param content - The assembled report content (from student_reports.content JSONB)
 * @returns Buffer containing the PDF bytes
 * @throws Error if rendering fails
 */
export async function renderReportPdf(content: ReportContent): Promise<Buffer> {
  try {
    // NOTE:
    // @react-pdf/renderer types `renderToBuffer` as requiring a ReactElement<DocumentProps>
    // (i.e. the <Document /> element itself).
    //
    // Our `ReportDocument` is a component that *returns* <Document />, but TypeScript
    // cannot prove that, so we cast to the expected element type.
    const doc = React.createElement(ReportDocument, {
      content,
    }) as unknown as React.ReactElement<DocumentProps>;

    const bufferLike = await renderToBuffer(doc);

    // Some versions return ArrayBufferLike; normalize to Buffer
    return Buffer.isBuffer(bufferLike)
      ? bufferLike
      : Buffer.from(bufferLike as any);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown PDF rendering error";
    throw new Error(`PDF generation failed: ${message}`);
  }
}

/**
 * Generates a safe filename for a student report PDF.
 *
 * Format: StudentName_Term_Report.pdf
 * Example: Emily_Chen_Term_1_2026_Report.pdf
 */
export function generateReportFilename(content: ReportContent): string {
  const safeName = content.student_name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_");
  const safeTerm = content.term
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_");
  return `${safeName}_${safeTerm}_Report.pdf`;
}

/**
 * Generates the Supabase Storage path for a report PDF.
 *
 * Path: reports/{tenant_id}/{student_id}/{report_id}.pdf
 * WHY: Mirrors the Google Drive folder hierarchy. Tenant-scoped
 * at the top level for easy bucket RLS.
 */
export function generateReportStoragePath(params: {
  tenantId: string;
  studentId: string;
  reportId: string;
}): string {
  return `reports/${params.tenantId}/${params.studentId}/${params.reportId}.pdf`;
}
