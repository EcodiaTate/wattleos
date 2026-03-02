# Classes and Enrollments

Classes in WattleOS represent the Montessori environments your students belong to — Casa, Lower Elementary, Adolescent, and so on. The enrollment system tracks which students are in which class, when they started, and their full movement history including transfers and withdrawals.

## Creating a Class

Navigate to **Classes** in the sidebar and click **Add Class**. Every class needs a name (for example, "Banksia Room" or "Wattle Environment"). Optionally, you can set a room name if the physical space differs from the class name, and a cycle level to indicate the Montessori age grouping.

The available cycle levels are Infant/Toddler (0–3), Primary/Casa (3–6), Lower Elementary (6–9), Elementary (6–12), Upper Elementary (9–12), Adolescent (12–15), and Upper Adolescent (15–18). Setting a cycle level helps with filtering and reporting, but it is not required — some schools use multi-age groupings that do not map neatly to one level.

## Editing and Deactivating Classes

Open a class and click **Edit** to update the name, room, or cycle level. You can also toggle a class between active and inactive. Deactivating a class hides it from most selection dropdowns while preserving historical enrollment data.

Deleting a class is a soft delete. Before the class is marked as deleted, WattleOS automatically withdraws all students who have an active enrollment in that class. This ensures no student is left in a "ghost" enrollment. Because of this cascading effect, deletion should be done with care — consider deactivating instead if students still need to be transferred manually.

## The Class Roster

Each class has a roster page showing all currently enrolled students. The roster is built from active enrollment records, not from a static list. This means that when a student is enrolled, transferred, or withdrawn, the roster updates immediately. The roster displays each student's name and is sorted by enrollment date.

## Enrolling a Student

There are two ways a student gets enrolled in a class. The most common path is through the admissions pipeline: when an enrollment application is approved, the administrator selects a class and WattleOS automatically creates the enrollment record, linking the student to that class with an active status and the requested or assigned start date.

For manual enrollment — such as when a student is added directly without going through admissions — you can use the enrollment action from the student profile or class page. You need to specify the student, the target class, and a start date. WattleOS validates that the student does not already have an active enrollment in the same class before creating the record.

Enrollment records track a status (active, completed, or withdrawn), a start date, and an optional end date. An active enrollment with no end date means the student is currently attending that class.

## Transferring Between Classes

When a student moves from one environment to another — for example, transitioning from Casa to Lower Elementary — use the transfer action. A transfer requires the student, the source class, the target class, and a transfer date.

Behind the scenes, WattleOS completes the enrollment in the source class (setting its status to completed and the end date to the transfer date) and creates a new active enrollment in the target class starting on the same date. If the student already has an active enrollment in the target class, the transfer is blocked. If something goes wrong creating the new enrollment, WattleOS attempts to roll back the withdrawal from the source class so the student is not left without any active enrollment.

## Withdrawing a Student

Withdrawing a student from a class sets the enrollment status to withdrawn and records the withdrawal date as the end date. This is used when a student leaves the school or when you need to remove them from a specific class without transferring them elsewhere.

Withdrawal is distinct from changing the student's overall enrollment status on their profile. A student could be withdrawn from one class while remaining active at the school (for example, during a class restructure). To fully exit a student from the school, you would typically withdraw them from their class and also update their profile status to withdrawn.

## Enrollment History

Every student's profile includes a full enrollment history section showing all past and current enrollments. Each entry shows the class name, start date, end date (if applicable), and status. This provides a complete audit trail of the student's journey through your school — which environments they have been part of and when they moved.

## Permissions

Managing classes (create, edit, delete) and managing enrollments (enroll, transfer, withdraw) requires the **MANAGE_STUDENTS** permission. Enrollment operations that occur during admissions approval require the **MANAGE_ENROLLMENT** permission. The enrollment status field on the student profile edit form is only visible to users who hold MANAGE_ENROLLMENT. Viewing class rosters and enrollment history requires **VIEW_STUDENTS**.
