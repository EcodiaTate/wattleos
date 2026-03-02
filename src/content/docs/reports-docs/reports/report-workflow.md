# Report Workflow

Reports in WattleOS follow a four-stage workflow that ensures quality control before reports reach parents. Each stage has specific allowed transitions, preventing reports from being published without review.

## Workflow Stages

### Draft

Every report starts as a draft after generation. In this stage, the teacher writes narratives, reviews auto-populated data, and marks sections as complete.

**Available actions**: Submit for Review

A draft report can be edited freely. It is only visible to staff with the Manage Reports permission — parents cannot see draft reports.

### Review

After the teacher completes their writing, they submit the report for review. In review status, a reviewer (typically a lead guide, director, or pedagogical coordinator) reads the report and checks for quality, accuracy, and completeness.

**Available actions**: Send Back to Draft, Approve

If the reviewer identifies issues — missing content, unclear language, factual errors — they send the report back to draft with feedback. The teacher then revises and resubmits.

If the report meets standards, the reviewer approves it.

### Approved

An approved report has passed quality review and is ready for distribution. At this stage, PDF export becomes available.

**Available actions**: Send Back to Review, Publish

The approved stage gives the school a final checkpoint before parents see the report. An administrator can review all approved reports for a class and publish them together, or publish individually as they are ready.

### Published

A published report is visible to parents through the Parent Portal. The `published_at` timestamp is set when the report enters this stage.

**Available actions**: Unpublish (returns to Approved)

Published reports can be unpublished if an error is discovered after distribution. Unpublishing removes the report from the Parent Portal and clears the published timestamp.

## Transition Rules

The workflow enforces strict transition rules. You cannot skip stages:

| From | Allowed transitions |
|---|---|
| Draft | → Review |
| Review | → Draft, → Approved |
| Approved | → Review, → Published |
| Published | → Approved |

Attempting an invalid transition (e.g. Draft → Published) returns an error with a message explaining which transitions are valid from the current status.

## Status Indicators

Each status has a colour-coded badge in the UI:

- **Draft** — Styled with the report-draft colour variable
- **In Review** — Styled with the report-review colour variable
- **Approved** — Styled with the report-approved colour variable
- **Published** — Styled with the report-published colour variable

These colours are part of WattleOS's design system and adapt to the school's theme settings.

## Workflow Actions in the Editor

The Report Editor shows workflow action buttons based on the current status. When viewing a draft, you see "Submit for Review." When viewing a report in review, you see both "Send Back to Draft" and "Approve." The buttons are styled to distinguish primary actions (moving forward) from secondary actions (sending back) and danger actions (unpublishing).

All status transitions are audit-logged, recording who changed the status, what the previous and new statuses were, and which student the report belongs to.

## Deleting Reports

Draft and review reports can be deleted (soft-deleted). Published reports cannot be deleted — they must be unpublished first, which returns them to approved status, and then they still cannot be deleted because they have been distributed. This protects the integrity of reports that parents have already seen.

Approved reports that have never been published can be sent back to review and then to draft, where they become deletable.

## Recommended Workflow

A typical end-of-term reporting cycle looks like:

1. **Administrator** generates reports in bulk for each class using the appropriate template
2. **Teachers** write their narratives and mark sections complete, then submit for review
3. **Lead guide or director** reviews each report, sending back any that need revision and approving those that are ready
4. **Administrator** publishes approved reports, either one class at a time or all at once
5. **Parents** receive reports in their Parent Portal and can download PDFs

## Permissions

**Manage Reports** — Required for all workflow transitions. Any staff member with this permission can move reports through the workflow. Schools should limit this permission to guides and administrators to maintain quality control.
