# Submitting and Approving Timesheets

The timesheet workflow bridges the gap between individual time logging and payroll processing. Staff submit their timesheets, an approver reviews and approves or rejects them, and approved timesheets are synced to the external payroll system. This three-step process ensures hours are verified before money moves.

## Submitting a Timesheet

Once you have logged your hours for a pay period, click **Submit** on the timesheet grid page. WattleOS aggregates all your time entries for that period and calculates three hour totals: regular hours (from regular and public holiday entries), overtime hours, and leave hours (from sick leave, annual leave, and unpaid leave). A grand total is computed from all three.

Submission requires at least one time entry in the period - you cannot submit an empty timesheet. If the pay period has already been processed, submission is blocked.

If you have previously submitted and your timesheet was rejected, you can edit your entries (assuming the period is still open) and resubmit. The resubmission updates the existing timesheet record with new totals and resets the status to submitted.

After submission, your timesheet grid shows a status banner indicating the current state. You can still view your entries but cannot edit them until the timesheet is either approved (in which case the period moves forward) or rejected (in which case you can make corrections and resubmit).

## The Approval Interface

Administrators and approvers access the approval workflow from **Admin → Timesheets**. This page shows all submitted timesheets awaiting review, grouped by pay period.

Each submitted timesheet in the list shows the staff member's name, the pay period, total hours with the regular/overtime/leave breakdown, and the submission date. Expanding a timesheet reveals the full daily entries - every day's start time, end time, break, entry type, notes, and calculated hours. This lets the approver verify the details before making a decision.

## Approving a Timesheet

Click **Approve** on a submitted timesheet to accept it. WattleOS records the approver's user ID and the approval timestamp. The timesheet status changes from submitted to approved, and it becomes eligible for payroll sync.

For efficiency, the approval interface supports **batch approve**. Select multiple submitted timesheets using the checkboxes, then click **Approve Selected** to approve them all in one action. This is particularly useful at the end of a pay period when most timesheets are straightforward and can be approved without individual inspection.

## Rejecting a Timesheet

If a timesheet has issues - missing days, incorrect entry types, unusual hours - click **Reject**. You are prompted to enter rejection notes explaining what needs to be corrected. These notes are stored on the timesheet record and displayed to the staff member when they view their rejected timesheet.

After rejection, the staff member sees a rejection banner on their timesheet grid showing the notes. If the pay period is still open, they can edit their time entries and resubmit. If the period has been locked, the staff member will need to contact the administrator to resolve the issue.

## Timesheet Lifecycle Summary

The full lifecycle flows through five statuses. **Draft** means time entries exist but the timesheet has not been submitted (this state is implicit - a timesheet record is created on first submission). **Submitted** means the staff member has submitted their hours for review. **Approved** means the approver has accepted the timesheet. **Rejected** means the approver has sent it back for corrections. **Synced** means the approved hours have been pushed to the external payroll system.

A rejected timesheet can be resubmitted, returning to submitted status. Approved timesheets move forward to synced. There is no path backward from synced - once hours have been sent to payroll, the timesheet is finalised.

## What Approvers Should Check

When reviewing a timesheet, consider whether the total hours are reasonable for the period, whether leave entries match any leave requests you are aware of, whether overtime entries are expected and authorised, whether any days are missing that should have entries, and whether the notes provide adequate context for unusual entries. The daily entry breakdown gives you complete visibility to make these assessments.

## Permissions

Submitting timesheets requires the **LOG_TIME** permission. Approving and rejecting timesheets requires the **APPROVE_TIMESHEETS** permission. Batch approval uses the same permission. Typically, the Head of School or a designated administrator holds the approval permission.
