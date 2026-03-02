# Tour Management

School tours are a key step in the admissions pipeline. WattleOS lets administrators create tour time slots with capacity limits, assign guides, and offer self-service booking through a public page. Tour attendance feeds directly into the admissions pipeline.

## Accessing Tours

Navigate to **Admin → Admissions**, then click the **Tours** quick link, or go directly to **Admin → Admissions → Tours**. Managing tours requires the **Manage Tours** permission.

## Tour Slots

A tour slot represents a specific date and time window when the school can host prospective families. Each slot has:

- **Date** — The calendar date of the tour
- **Start and end time** — The time window (e.g. 10:00 AM – 11:30 AM)
- **Maximum families** — The capacity limit for the slot (default: 5 families)
- **Guide** — The staff member leading the tour (optional, for scheduling visibility)
- **Location** — Where the tour begins (e.g. "Main Reception," "Front Gate")
- **Notes** — Internal notes for staff (e.g. "Cycle 1 focus" or "Rainy day plan: start in hall")

### Creating Slots

Click **New Tour Slot** and fill in the date, times, capacity, and optional details. Slots are created as active and immediately become available on the public booking page.

### Bulk Creation

For recurring tours (e.g. every Wednesday at 10 AM for the term), use **Bulk Create**. Select multiple dates, set a shared start time, end time, capacity, guide, and location. All slots are created in a single operation.

### Managing Slots

The tour management page lists all slots with their date, time, guide, capacity, bookings count, and attendance count. You can edit any slot to change its details, deactivate it (hiding it from the public booking page while preserving existing bookings), or delete it if it has no bookings.

## Tour Bookings

When a waitlist entry is moved to the **Tour Scheduled** stage, the entry is linked to a tour slot. The slot's detail view shows all bookings with the child name, parent name, parent email, and whether the tour was attended.

### Marking Attendance

After a tour takes place, staff can mark each booking as attended or not attended. Marking attendance updates the waitlist entry's tour details (tour_attended flag, tour notes) and supports transitioning the entry to the Tour Completed stage.

## Public Tour Booking

Prospective families can view available tour slots and book a spot through the public page at your school's subdomain (`yourschool.wattleos.au/tours`). This page shows:

- Available dates with spots remaining
- Time and location details
- A booking form to submit their details

Only active slots with remaining capacity (booked families less than maximum) are displayed. Past dates are hidden automatically.

When a family books through the public page, their inquiry is either linked to an existing waitlist entry (matched by parent email) or a new inquiry is created and immediately transitioned to Tour Scheduled.

## Tour Slot Details View

Click on any tour slot to see its full details, including all bookings for that slot. The detail view shows:

- Slot information (date, time, guide, location, capacity)
- A list of booked families with attendance status
- Available spots remaining
- Quick actions to edit the slot or mark attendance

## Connection to the Pipeline

Tours integrate directly with the admissions pipeline:

1. When a family books or is assigned a tour → entry moves to **Tour Scheduled**
2. Tour date and guide information are recorded on the waitlist entry
3. After the tour, staff marks attendance → entry moves to **Tour Completed**
4. Tour notes are saved on the entry for future reference during offer decisions

This integration means tour data flows automatically into the pipeline without duplicate data entry.

## Permissions

- **Manage Tours** — Create, edit, deactivate, and delete tour slots. View bookings and mark attendance.
- **Manage Waitlist** — Required to transition pipeline entries to Tour Scheduled (linking entries to slots)
