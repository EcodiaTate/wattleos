# PDF Export and Parent View

WattleOS generates professional PDF report cards and makes published reports available to parents through the Parent Portal.

## PDF Export

### When PDFs Are Available

PDF export is only available for reports in **Approved** or **Published** status. Draft and in-review reports cannot be exported — this ensures parents only receive finalised, quality-reviewed documents.

### Generating a PDF

From the Report Editor or the report detail page, click **Export PDF**. WattleOS:

1. Renders the report content using `@react-pdf/renderer`, a React-based PDF generation library that produces professional, consistently formatted documents
2. Uploads the generated PDF to Supabase Storage in a tenant-scoped path (`reports/{tenantId}/{studentId}/{reportId}.pdf`)
3. Updates the report record with the storage path
4. Returns a signed download URL valid for one hour

The PDF downloads automatically in your browser. If you need to download it again later, click **Download PDF** — this retrieves a fresh signed URL for the existing PDF file.

### PDF Contents

The generated PDF includes all sections from the report in template order:

- Student information (name, class, DOB, photo if available)
- Auto-populated data sections rendered as formatted tables and statistics
- Teacher narratives rendered as flowing prose
- Mastery grids with colour-coded status indicators
- Attendance summaries with counts and percentages

The PDF is styled with the WattleOS branding — the school name appears in the header. The layout is designed for A4 printing with appropriate margins and page breaks.

### Re-exporting

If you update a report's content after generating a PDF (for example, fixing a typo in an approved report that was sent back to review and then re-approved), you can export again. The new PDF overwrites the previous one in storage (upsert pattern), ensuring parents always get the latest version.

## Parent Report View

### How Parents Access Reports

Parents see published reports through the **Parent Portal**. Navigate to a child's profile and select the **Reports** tab to see a list of all published reports for that child.

The reports list shows:
- Term label (e.g. "Term 1 2026")
- Template name (e.g. "End of Term Report")
- Published date
- Author name (the teacher who wrote the report)

Click on a report to open the read-only viewer.

### The Parent Report Viewer

The parent viewer displays the full report content in a clean, read-only format. All sections are shown — student information, mastery data, attendance summaries, observation highlights, and teacher narratives.

The viewer is intentionally separate from the staff editor. There are no editing controls, no workflow buttons, and no status indicators. Parents see a polished presentation of the report content.

### PDF Download for Parents

Parents can download a PDF copy of published reports. The download button appears on the report viewer page. Parent PDF downloads use a dedicated API route (`/api/reports/{reportId}/pdf?parent=true`) that verifies the parent's guardian relationship to the student before serving the file.

### Visibility Rules

Parents can only see reports that meet all of these conditions:

- The report status is **Published** (draft, review, and approved reports are invisible)
- The student is linked to the parent as a guardian
- The report belongs to the same school (tenant) as the parent's account
- The report has not been soft-deleted

These rules are enforced at both the application layer (guardian relationship check) and the database layer (RLS policies on `student_reports` that check status and tenant).

If a report is unpublished (status changed from Published back to Approved), it immediately disappears from the Parent Portal. If it is re-published later, it reappears.

## Storage and Security

PDF files are stored in Supabase Storage with tenant-scoped paths. Access is controlled through signed URLs that expire after one hour. Staff access PDFs through the `exportReportToPdf` and `getReportPdfUrl` server actions. Parent access goes through a dedicated API route with guardian verification.

PDF storage paths follow the format: `{tenantId}/{studentId}/{reportId}.pdf`. This ensures complete isolation between schools and provides a predictable path structure for storage management.

## Permissions

- **Manage Reports** — Required for staff to export PDFs and download reports
- **Parent role** — Automatically grants access to download published reports for their own children
