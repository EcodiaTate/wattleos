# Report Templates

Report templates define the structure of end-of-term student reports. Each school designs its own templates by composing sections in the order they want them to appear. This gives schools complete control over what their reports contain and how they are organised.

## Why Templates

Every Montessori school has different reporting requirements. Some focus heavily on narrative commentary, others want detailed mastery grids, and others prioritise attendance data and observation highlights. Rather than shipping a fixed report format, WattleOS lets each school design templates that match their style and their families' expectations.

Templates follow the same pattern as curriculum: you build the structure once, then generate individual reports for each student from that structure.

## Accessing Templates

Navigate to **Reports → Templates** in the sidebar. This requires the **Manage Reports** permission, which is included in the default Administrator and Guide roles.

## Section Types

Templates are built from eight section types. Each type determines what data gets auto-populated when a report is generated, what the teacher needs to write, and how the section renders in the final report.

### Auto-Populated Sections

These sections pull data directly from WattleOS when a report is generated. The teacher does not need to write anything — the system fills them in.

**Student Information** — The student's name, preferred name, date of birth, photo, current class, cycle level, and enrollment status. This is typically the first section of any report.

**Mastery Summary** — Counts and percentages of the student's mastery progress across the curriculum. Shows totals for not started, presented, practicing, and mastered outcomes. Can be configured to display as percentages, raw counts, or both, and can be filtered to a specific curriculum area or show all areas combined.

**Mastery Grid** — A detailed breakdown of individual outcomes and their mastery status. Shows each outcome title with its colour-coded status. Can be filtered to a specific curriculum area (e.g. "Mathematics" only) or show all outcomes. This is useful for schools that want parents to see exactly which outcomes their child has progressed through.

**Attendance Summary** — Attendance statistics for the reporting period: total days, present, absent, late, excused, half day, and attendance rate percentage. Can be configured to show a simple summary or a detailed daily breakdown.

### Semi-Auto Sections

**Observation Highlights** — Recent published observations for the student within the reporting period, showing the observation text, author, linked curriculum outcomes, and media count. The system auto-selects the most recent observations (configurable maximum, default 5), but the teacher should review and curate which ones to include. This section is not marked as complete automatically — the teacher must confirm the selection.

### Manual Sections

These sections start empty when a report is generated. The teacher writes the content.

**Narrative** — A free-text section for the teacher's commentary on the student's progress, strengths, and areas for growth. This is the heart of a Montessori report — the personal, professional observation that no system can auto-generate. Templates can include a placeholder hint and a suggested minimum word count to guide teachers.

**Custom Text** — A general-purpose free-text section that can be titled anything: "Social Development," "Community Involvement," "Special Projects," or any other heading the school wants. Multiple custom text sections can be added to a single template.

**Goals** — A section for the teacher to outline learning goals and focus areas for the upcoming term. Like narrative, this starts empty with an optional placeholder hint.

## Building a Template

### Creating a New Template

1. Navigate to **Reports → Templates**
2. Click **New Template**
3. Enter a name (e.g. "Term Report — Primary" or "End of Year — Cycle 1")
4. Optionally set a cycle level to associate the template with a specific age group
5. Click Create

New templates start with a default structure: Student Information, Attendance Summary, Learning Progress (mastery summary), Teacher Comments (narrative), and Goals for Next Term. You can customise this structure in the Template Builder.

### The Template Builder

Open a template to access the builder. The builder displays your sections in order, with controls to:

**Add sections** — Click the add button to open the section catalogue. Select a section type to add it to the end of the template. Some section types (like Student Information) can only appear once; others (like Custom Text and Narrative) can be added multiple times.

**Remove sections** — Click the delete button on any section to remove it. Auto-populated sections can be removed if your school does not want that data in reports.

**Reorder sections** — Drag sections up or down to change their display order. The order in the builder is the order they appear in generated reports.

**Configure sections** — Expand a section to edit its settings. Options vary by section type:

- **Title**: Change the heading displayed in the report (e.g. rename "Teacher Comments" to "Guide's Observations")
- **Curriculum area filter**: For mastery sections, choose "All" or a specific area
- **Curriculum instance**: Which curriculum instance to pull mastery data from
- **Display mode**: For mastery summary, choose percentages, counts, or both
- **Max observations**: For observation highlights, how many to auto-include
- **Placeholder text**: For manual sections, the hint shown to teachers when writing
- **Suggested minimum words**: For narrative sections, a guidance word count

Changes in the builder must be saved explicitly. A "Save Template" button persists your changes. The builder tracks unsaved changes and warns you before navigating away.

### Duplicating Templates

If you want a variation of an existing template (e.g. a version with mastery grid for older students and one without for younger), click **Duplicate** on the template list page. This creates a copy with "(Copy)" appended to the name, which you can then rename and modify.

### Deactivating and Deleting

**Deactivate** a template to hide it from the generation form without deleting it. Deactivated templates are preserved with all their settings and can be reactivated later.

**Delete** is only possible for templates that have no reports generated from them. If reports exist, deactivate instead. This prevents orphaned reports that reference a deleted template.

## Permissions

**Manage Reports** — Required to create, edit, duplicate, deactivate, and delete templates. This permission also grants access to generate, edit, and publish reports.
