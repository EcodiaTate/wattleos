# School Events

School events let administrators create, publish, and manage calendar events with RSVP tracking. Events appear alongside announcements in the parent communication feed, providing a unified view of everything happening at the school.

## Accessing Events

Navigate to **Comms → Events** in the sidebar. Managing events requires the **Manage Events** permission.

## Creating an Event

Click **New Event** to open the creation form:

**Title** — The event name (e.g. "End of Term Concert," "Cycle 2 Excursion to Botanic Gardens").

**Description** — Detailed information about the event: what to bring, what to expect, special instructions.

**Event Type** — Categorises the event for filtering and display. Each type has a distinctive icon:
- General, Excursion, Parent Meeting, Performance, Sports Day, Fundraiser, Professional Development, Public Holiday, Pupil Free Day, Term Start, Term End

**Date and Time** — Set the start date/time and optionally an end date/time. For full-day events, toggle **All Day** to hide the time component. The system validates that end time cannot be before start time.

**Location** — Where the event takes place (e.g. "School Hall," "Royal Botanic Gardens, Brisbane"). Optionally include a location URL for a map link.

**Scope** — Controls who sees the event:
- **School** — Visible to everyone
- **Class** — Visible only to the selected class's staff and parents
- **Program** — Visible only to the selected program's participants
- **Staff** — Visible only to staff members (for professional development, staff meetings, etc.)

**Attachments** — Attach permission forms, maps, schedules, or other documents.

## RSVP

Events can optionally enable RSVP to track attendance:

**RSVP Enabled** — Toggle to allow responses. When disabled, the event is informational only with no response options.

**RSVP Deadline** — Optional cutoff date after which responses are no longer accepted. The system blocks late RSVPs with a clear message.

**Maximum Attendees** — Optional capacity limit. When a "Going" response would exceed the maximum (counting both attendees and their guests), the RSVP is blocked with a capacity message.

### Responding to Events

Parents and staff can respond with three options:

- **Going** — Confirmed attendance. Can include a guest count (e.g. bringing a partner or sibling).
- **Maybe** — Tentative, may attend.
- **Not Going** — Will not attend.

Responses include an optional notes field for additional information (e.g. "Arriving 10 minutes late" or "Dietary requirement: vegetarian").

RSVPs use an upsert pattern — a user can change their response at any time before the deadline. The most recent response replaces the previous one.

### RSVP Tracking

The event detail page shows RSVP statistics: counts for Going, Not Going, and Maybe, plus total guests. Staff with the Manage Events permission can see the full list of respondents with their names, response status, guest count, notes, and response timestamp.

This makes it easy to plan for catering, seating, transport, and other logistics that depend on knowing how many people will attend.

## Event List

The events page shows upcoming and recent events in chronological order. The list supports filtering by:

- **Scope** — School, class, program, or staff
- **Event type** — Filter to a specific category (e.g. show only excursions)
- **Target class** — When filtering by class scope
- **Date range** — Show events between specific dates

Each event card shows the title, type icon, date/time, location, scope badge, and RSVP summary (if enabled).

## Editing and Deleting

Events can be edited after creation — all fields are modifiable. This is important for events where details change (venue update, time change, etc.). Existing RSVPs are preserved when an event is edited.

Deleting an event is a soft delete. The event is removed from all feeds. RSVPs associated with the event are preserved in the database.

## Parent View

Parents see events in their Parent Portal alongside announcements, creating a unified communication feed. School-scoped events appear for all parents. Class-scoped events only appear for parents of students in that class. Program-scoped events only appear for parents with children in that program. Staff-scoped events are not visible to parents.

Parents can RSVP directly from the event card in their feed.

## Permissions

- **Manage Events** — Create, edit, and delete events. View RSVP lists and statistics.
