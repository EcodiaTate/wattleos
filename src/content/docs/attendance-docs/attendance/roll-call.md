# Taking the Daily Roll

Roll call is the primary daily attendance workflow in WattleOS. It is designed for speed on iPad - large tap targets, optimistic saving, and a "Mark All Present" shortcut for good days.

## Who Can Take the Roll

You need the **Manage Attendance** permission to access the roll call page. This permission is included in the default Guide and Administrator roles.

## Getting Started

Navigate to **Attendance** in the sidebar or click "Take Attendance" from the Dashboard quick actions. This opens the roll call page at `/attendance`.

The page has three controls at the top:

**Class selector** - Choose which class to take the roll for. If your school only has one class, it is auto-selected. Each class shows its name, room number, and cycle level (e.g. "Lower Primary - Room 3 (3-6)").

**Date picker** - Defaults to today's date. You can change this to record attendance for a past date (for example, if you forgot to take the roll yesterday). The date is displayed in full Australian format below the controls ("Wednesday, 19 February 2025").

**Mark All Present** - A green button that sets every unmarked student to Present in one tap. This is the fastest path when all students are in attendance.

## The Student List

Once a class and date are selected, WattleOS loads all actively enrolled students for that class, sorted by last name. Each student row shows:

- **Photo and name** - The student's photo (or initial) and their preferred name. If a student goes by "Mia" but is enrolled as "Amelia," you see "Mia."
- **Medical alerts** - Any severe or life-threatening medical conditions appear as small coloured badges directly on the row. Life-threatening conditions (like anaphylaxis) show in red; severe conditions (like asthma) show in orange. This ensures guides see critical health information every time they interact with the student list.
- **Status buttons** - Five buttons for each attendance status, plus a notes button.

## Attendance Statuses

WattleOS supports five attendance statuses:

**Present** (green, ✓) - The student is at school for the full day.

**Absent** (red, ✗) - The student is not at school.

**Late** (amber, ⏰) - The student arrived after the expected start time.

**Excused** (blue, 📝) - The student is absent but the absence has been explained (doctor's appointment, family event, etc.).

**Half Day** (purple, ½) - The student attended for part of the day.

On mobile and iPad, status buttons show icons. On desktop, they show text labels.

## How Marking Works

Tap a status button to mark a student. The button highlights immediately (optimistic update) and the record is saved to the database in the background. You do not need to wait for each save to complete before marking the next student.

This optimistic approach means that if you are interrupted (a child needs help, a parent arrives), the students you have already marked are safely saved. You can return and continue the roll.

**Toggling**: Tapping the same status button again clears that student's status back to unmarked. This lets you quickly correct mistakes.

**Technical detail**: Each mark uses a database upsert on a unique constraint of tenant, student, and date. This means marking the same student twice on the same day updates the existing record rather than creating a duplicate.

## Adding Notes

Each student row has a notes button (pencil icon). Click it to expand a text input where you can add a note for that student's attendance record. Notes are useful for recording context: "Left early at 2pm for dentist," "Arrived at 9:45, parent called ahead," or "Feeling unwell, resting in quiet area."

The notes button turns blue when a note has been entered, providing a visual indicator that additional context exists for that record.

## The Summary Bar

A real-time summary bar appears above the student list showing colour-coded counts: Total students, Present, Absent, Late, and Unmarked. These numbers update instantly as you tap status buttons, giving you a quick view of class attendance at a glance.

## Saving the Roll

When you have marked all students, click **Save Roll** at the bottom. This performs a bulk save of all attendance records for the class and date. Any students you have not individually marked are recorded as Absent.

The save button shows a message indicating how many unmarked students remain: "3 students unmarked - they'll be recorded as absent." This gives you a chance to review before committing.

After saving, a success message confirms the total number of students recorded.

## Mark All Present

The **Mark All Present** button is the fastest workflow for a day when everyone is in attendance. It sets all currently unmarked students to Present (it does not change students you have already marked with a different status). After marking, a bulk save runs automatically.

A typical flow: Tap "Mark All Present," then change just the two students who are absent or late. This handles the common case in seconds.

## Re-taking the Roll

You can return to the roll call page at any time during the day. Previously marked statuses load automatically for the selected date. You can change any student's status by tapping a different button - the upsert pattern ensures the existing record is updated, not duplicated.

This is useful when a student arrives late (change from Absent to Late), leaves early (change to Half Day), or when a parent calls to explain an absence (change from Absent to Excused and add a note).
