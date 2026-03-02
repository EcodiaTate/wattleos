# Attendance History

The attendance history page provides a reporting view of attendance over time. While roll call is today's workflow (tap-to-mark), history is a review tool showing patterns across days and weeks.

## Accessing History

From the main Attendance page, click **History** in the top-right corner. You can also navigate directly to `/attendance/history`. You need the **Manage Attendance** or **View Attendance Reports** permission.

## Filters

The history page has three filters:

**Class** — Select a class to view. If your school has one class, it auto-selects. If you have multiple classes, you must select one before data appears.

**From / To** — A date range picker. Defaults to the last two weeks. Adjust these to view any period — a specific school week, a full term, or the entire year.

Data reloads automatically when any filter changes.

## Summary Cards

When data is available, four summary cards appear at the top:

**Attendance Rate** — The overall percentage of students who were present, late, or attending a half day (all three count as "in attendance"). Shows the number of school days in the range.

**Total Present** — The raw count of Present records, out of the total number of attendance records.

**Total Absent** — The count of Absent records. If there are any absences, the sublabel reads "Needs follow-up."

**Total Late** — The count of Late records.

## Daily Breakdown Table

Below the summary cards, a table shows one row per school day within the date range, sorted newest first. Each row displays:

- **Date** — Formatted as day-of-week, day, month (e.g. "Wed, 19 Feb")
- **Total** — The number of students with a record that day
- **Present / Absent / Late / Excused / Half Day** — Colour-coded badge counts for each status. A dash (–) appears if the count is zero
- **Rate** — That day's attendance rate as a percentage

This table makes it easy to spot patterns: a day with an unusually high absent count, a pattern of late arrivals on Mondays, or a gradual decline in attendance towards the end of term.

## Empty States

If no class is selected, a message prompts you to choose one. If no attendance records exist for the selected class and date range, a message confirms this so you know the filter is working correctly and there simply are no records.

## Navigating to the Absence Report

The history page includes a link to the **Absence Report** in the top-right corner. The absence report focuses specifically on unexplained absences that require follow-up — a complementary view to the broader history.
