# Absence Report

The absence report surfaces absent and late records that need follow-up. In Australia, schools are required to follow up on unexplained absences, and this report makes those records easy to find and act on.

## Accessing the Report

From the main Attendance page, click **Absences** in the top-right corner. You can also navigate directly to `/attendance/absences`. You need the **View Attendance Reports** permission, which is included in the default Administrator role.

## Filters

The absence report has four filters:

**Class** — Filter by a specific class or view "All classes" to see absences across the school.

**From / To** — A date range picker. Defaults to the last seven days, which covers the typical follow-up window for Australian regulatory requirements.

**Unexplained only** — A checkbox that is enabled by default. When checked, the report only shows absence records that have no notes attached. An absence without notes is considered "unexplained" because no reason has been recorded. Uncheck this to see all absences and late arrivals regardless of whether a note exists.

## Alert Banner

When viewing unexplained absences and there are results, a red alert banner appears at the top: "X unexplained absences require follow-up." This provides an immediate visual cue that action is needed.

## Results Table

The report displays results in a table with four columns:

**Student** — The student's name and photo, linked to their student profile. Click to navigate to the student's full record.

**Date** — The date of the absence, formatted as day-of-week, day, month (e.g. "Wed, 19 Feb").

**Status** — A colour-coded badge showing either Absent (red) or Late (amber).

**Notes** — If a note exists, it is displayed as text. If no note exists, a red "Unexplained" label with a warning icon appears. This makes it immediately clear which records need attention.

## Workflow

A typical follow-up workflow:

1. Open the Absence Report at the start of the day or during planning time
2. Review the unexplained absences from the past week
3. Contact the parent by phone, email, or through WattleOS Communications to request an explanation
4. Once the parent explains, return to the Attendance page, find the student's record for that date, and add a note with the explanation (e.g., "Parent confirmed — doctor's appointment")
5. The record now has notes and will no longer appear in the Unexplained Only filter

## Empty State

When all absences in the date range have been explained (or there are no absences at all), the report shows a green checkmark with "No unexplained absences — All absences in this period have been explained." This provides positive confirmation that follow-up obligations are met.

## Relationship to Roll Call

The absence report reads from the same attendance records created during roll call. Adding notes during roll call (when you already know the reason for an absence) prevents those records from appearing in the unexplained filter. Encouraging guides to add notes during roll call reduces the administrative follow-up burden.
