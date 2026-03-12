# Sessions and Scheduling

Programs define the template - the schedule, pricing, and capacity rules. Sessions are the concrete, bookable instances: "Before School Care on Tuesday 4th March" is a session. WattleOS pre-generates sessions in advance so parents can browse availability and book ahead, while staff can override individual dates for holidays or special events.

## How Sessions Work

Each session belongs to a program and represents a single date with a start time, end time, and capacity limit. There is one session per program per day - you cannot have two separate "Before School Care" sessions on the same date, though you can create distinct programs if you need morning and afternoon offerings.

Sessions have four statuses. **Scheduled** means the session is upcoming and accepting bookings. **In progress** means the session is currently running (children are being checked in). **Completed** means the session has finished. **Cancelled** means the session has been removed from the schedule and any confirmed bookings should be handled.

## Generating Sessions

Rather than creating each session manually, WattleOS generates sessions automatically based on the program's schedule pattern. From the program detail page, you can trigger session generation for a specified number of weeks ahead (the default is four weeks).

The generation process looks at the program's default days (for example, Monday through Friday) and default start and end times, then creates a session record for each matching date in the generation window. If sessions already exist for those dates, they are skipped to avoid duplicates.

After sessions are generated, any active recurring booking patterns are applied. If a parent has a recurring pattern for "every Tuesday and Thursday OSHC," the generator automatically creates confirmed bookings on the matching sessions. If a session reaches capacity during this process, additional recurring bookings are placed on the waitlist.

Session generation can be run manually whenever you need to extend the booking horizon, and it can also be scheduled to run automatically on a weekly basis.

## Overriding Individual Sessions

Once a session has been generated, it can be modified independently of the program defaults. You can change the start or end time for a specific day, override the capacity (for example, reducing capacity when a staff member is away), assign a specific staff member or coordinator, change the location, or add notes.

Cancelling a session sets its status to cancelled. Parents with existing bookings for that session should be notified through the communications system. Cancelled sessions do not accept new bookings.

## The Session Calendar

The session calendar provides a week and month view of all sessions across all programs. Each session appears as a block showing the program name, time, and a booking count relative to capacity. Colour coding indicates the session status - scheduled sessions appear normally, in-progress sessions are highlighted, completed sessions are dimmed, and cancelled sessions are visually distinct.

Clicking a session on the calendar opens the session detail page, which shows all booked children, their check-in status, the waitlist, and session-level information like the assigned staff member and any notes.

## Session Detail Page

The session detail page is the operational hub for a specific session. It displays the full list of bookings grouped by status: confirmed children at the top, waitlisted children below, and cancelled or no-show bookings at the bottom. For each child, you can see their name, booking type (recurring or casual), check-in and check-out times, and medical alert badges.

From this page, staff can check children in and out, mark no-shows, cancel individual bookings, and manage the waitlist. The session detail page and the kiosk view (described in a separate article) share the same underlying data - actions taken in one are immediately reflected in the other.

## Permissions

Generating sessions, modifying session details, and cancelling sessions requires the **MANAGE_PROGRAMS** permission. Viewing sessions and their booking lists requires either MANAGE_PROGRAMS or **MANAGE_BOOKINGS**. Check-in and check-out actions from the session detail page require **CHECKIN_CHECKOUT**.
