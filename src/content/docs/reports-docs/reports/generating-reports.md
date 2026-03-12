# Generating Reports

Generating a report creates a filled-in copy of a template for a specific student, pulling in their data from across WattleOS. You can generate reports one at a time or in bulk for an entire class.

## Accessing Report Generation

Navigate to **Reports** in the sidebar, then click **Generate Reports**. This requires the **Manage Reports** permission.

## Single Report Generation

To generate a report for one student:

1. **Select a template** - Choose from your active report templates. Templates show their name and cycle level to help you pick the right one.
2. **Select a student** - Pick the student this report is for.
3. **Set the term** - Enter a term label (e.g. "Term 1 2026," "Semester 2," "End of Year"). This label appears on the report and is used to filter reports in the list view.
4. **Set the reporting period** - Choose a start and end date. These dates determine which attendance records and observations are included in auto-populated sections. For a standard term report, this would be the first and last day of the term.
5. Click **Generate**

WattleOS checks for duplicates - if a report already exists for the same student, template, and term, generation is blocked. This prevents accidental double-reports.

## What Happens During Generation

When you generate a report, WattleOS:

1. Reads the template's section structure
2. For each auto-populated section, queries the relevant data:
   - **Student Information**: fetches student profile, current class enrollment, and cycle level
   - **Mastery Summary/Grid**: fetches all mastery records, calculates counts and percentages, applies any curriculum area filters from the template configuration
   - **Attendance Summary**: queries attendance records within the reporting period dates, calculates present/absent/late/excused/half day totals and attendance rate
   - **Observation Highlights**: finds published observations tagged to the student within the reporting period, retrieves linked curriculum outcomes and media counts, limited to the configured maximum (default 5)
3. For manual sections (narrative, custom text, goals), creates empty placeholders for the teacher to fill in
4. Saves the report as a new `student_reports` record with status "draft"

Auto-populated sections are marked as complete immediately. Semi-auto sections (observation highlights) are populated but left as incomplete so the teacher reviews them. Manual sections start empty and incomplete.

## Bulk Generation

For end-of-term reporting, you will typically generate reports for every student in a class at once:

1. **Select a template** - Same as single generation
2. **Select students** - Choose multiple students (e.g. all students in a class)
3. **Set the term and reporting period** - These apply to all generated reports
4. Click **Generate All**

Bulk generation processes each student individually. If a report already exists for a student (same template and term), that student is skipped rather than producing an error. After completion, you see a summary: how many were generated, how many were skipped (already existed), and any errors.

## After Generation

Generated reports appear on the main Reports list page with a "Draft" status. From there, teachers edit the manual sections, and the report progresses through the workflow (Draft → Review → Approved → Published).

The Reports list page supports filtering by term, status, student, and author, making it easy to find reports that need attention.

## Reporting Period Tips

Choose your reporting period dates carefully - they directly affect what data appears in the auto-populated sections:

- **Attendance**: Only records between the start and end dates are counted. If your period is too narrow, the attendance summary will be incomplete.
- **Observations**: Only published observations created within the period are included. Draft observations are excluded. If an observation was published after the period end date but describes an event during the period, it will not be included automatically (the teacher can reference it in their narrative).
- **Mastery**: Mastery data is fetched as a current snapshot - it shows the student's mastery status at the time of generation, not just changes within the period. This is intentional: parents want to know where their child stands now, not just what changed this term.

## Permissions

**Manage Reports** - Required to generate reports (single or bulk).
