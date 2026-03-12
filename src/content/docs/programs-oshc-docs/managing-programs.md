# Managing Programs

Programs in WattleOS cover everything beyond the core Montessori classroom - before-school care, after-school care, vacation care, extracurricular activities, extended day, adolescent programs, senior electives, and any other wrap-around offering your school provides. Instead of managing these in a separate system with its own billing, attendance, and parent communication, WattleOS brings them into the same platform so parents see one calendar and one invoice.

## Program Types

When creating a program, you select one of eight types: **before school care**, **after school care**, **vacation care**, **extracurricular** (language classes, art, music, sport), **extended day**, **adolescent program**, **senior elective**, or **other**. The type determines how the program is categorised in lists and reports but does not restrict any functionality - all program types support the same scheduling, booking, and billing features.

## Creating a Program

Navigate to **Programs** in the sidebar and click **Add Program**. The form is divided into several sections.

The basics include a name (for example, "Before School Care" or "Friday Art Club"), an optional short code (like "BSC" or "ART-FRI"), the program type, and a description. The description is visible to parents when they browse available programs.

The eligibility section lets you restrict who can enroll. You can set a minimum age and maximum age in months - for example, a toddler program might be restricted to children aged 18 to 36 months. You can also restrict eligibility to students enrolled in specific classes if the program is only available to certain environments.

The schedule section defines the program's default pattern: which days of the week sessions run (Monday through Sunday), and the default start and end times. These defaults are used when generating sessions, though individual sessions can override them.

Capacity sets the maximum number of children per session. Leave it blank for unlimited capacity. When a session reaches its capacity, additional bookings are automatically placed on a waitlist.

## Pricing and Billing

Every program has a session fee in cents - this is the standard price charged per session for recurring bookings. You can optionally set a higher casual fee for one-off bookings. If no casual fee is set, the standard session fee applies to all booking types.

The billing type determines how charges appear: **per session** means each attended session generates a line item, **per term** charges a flat rate for the term, **per year** charges annually, and **included** means the program cost is bundled into tuition with no separate charge.

The cancellation policy defines how many hours of notice a parent must give before a session starts (default is 24 hours) and what late cancellation fee applies if they cancel within that window. When a parent cancels a booking after the notice period has passed, WattleOS automatically flags it as a late cancellation, and the late cancel fee can be applied to their billing.

## CCS Configuration

For Australian schools receiving Child Care Subsidy funding, each program can be marked as CCS eligible. When enabled, you can record the CCS activity type code and service approval number. These fields prepare the program for future CCS submission integration, where session attendance data would be reported to the government's PRODA system.

## Editing and Deactivating Programs

Open any program and click **Edit** to update its configuration. Changing the session fee does not retroactively affect existing bookings - fees are locked in at booking time, which matches how real-world OSHC billing works.

Programs can be toggled between active and inactive. Inactive programs stop appearing in the parent booking portal and are excluded from session generation, but existing bookings and historical data are preserved.

## Utilization Reports

The programs report page shows capacity versus actual attendance for each program over a selected date range. For each program, you can see the total number of sessions, total available capacity, total confirmed bookings, total checked-in children, the utilization percentage (bookings relative to capacity), and the attendance percentage (check-ins relative to bookings). This helps administrators identify underutilized programs and plan resource allocation.

## Permissions

Creating, editing, and deactivating programs requires the **MANAGE_PROGRAMS** permission. Viewing utilization reports requires **VIEW_PROGRAM_REPORTS**. CCS configuration requires **MANAGE_CCS_SETTINGS**. Booking and check-in permissions are described in their respective articles.
