# Kiosk Check-in and Check-out

The kiosk is a full-screen view designed for a tablet at your OSHC desk or program entrance. It provides large tap targets for checking children in and out of sessions, displays medical alert badges for safety, and records exact attendance times for CCS compliance. The kiosk is accessed at the dedicated route within the programs section and is optimised for iPad use.

## Opening the Kiosk

Navigate to **Programs** and select **Kiosk** from the navigation. The kiosk automatically loads today's sessions and shows all children with confirmed bookings. If your school runs multiple programs with overlapping sessions, the kiosk displays them together so front-desk staff can manage all check-ins from one screen.

The kiosk requires the CHECKIN_CHECKOUT permission. Users without this permission are redirected away from the kiosk page.

## The Kiosk Display

Each booked child appears as a large card showing their name and photo (or initials if no photo is uploaded). Next to each name, medical alert information is displayed — if a child has medical conditions on file, a summary appears so staff are immediately aware of allergies, asthma, or other conditions requiring attention. This is particularly important at the start of before-school care or vacation care sessions where casual staff may not know every child's medical history.

Children are visually distinguished by their check-in status. Children who are expected but have not yet arrived appear in one state. Once checked in, they shift to a confirmed state with their check-in time displayed. After check-out, the card shows both the check-in and check-out times.

## Checking In

Tap a child's card to check them in. WattleOS records the exact timestamp and the staff member who performed the check-in. The booking must be in confirmed status — you cannot check in a child who is on the waitlist or whose booking was cancelled.

If a child was checked in by mistake, you can undo the check-in as long as they have not yet been checked out. This clears the check-in timestamp and returns the card to its pre-arrival state. Once a child has been checked out, the check-in cannot be undone — this prevents accidental alteration of completed attendance records.

## Checking Out

When a child is collected, tap their card again to check them out. WattleOS validates that the child has been checked in before allowing check-out. The check-out timestamp and the staff member who processed it are recorded. A child cannot be checked out twice.

These check-in and check-out timestamps feed directly into the booking record. For CCS-eligible programs, the exact times form the basis of session attendance reports that can be submitted to the government — recording when each child arrived and departed is a compliance requirement, not just a convenience.

## No-Shows

If a child was booked into a session but did not attend, staff can mark the booking as a no-show from the session detail page (not the kiosk itself, which is focused on the physical check-in workflow). A no-show status means the child was expected but absent. Whether the session fee still applies is determined by your school's policy — WattleOS records the no-show status but does not automatically waive or charge the fee.

## Safety Features

The kiosk is designed with child safety as a primary concern. Medical condition summaries appear alongside each child's name so staff know about life-threatening allergies, required medication, or other conditions before the child enters the program. This information comes from the student's medical records and is displayed in a compact format suitable for quick reference.

The kiosk data includes a flag indicating whether each child has any medical conditions on file and, if so, a brief summary. This means even a casual staff member running their first OSHC shift can see at a glance which children need special attention.

## How It Connects to Attendance

A child checked into a program session through the kiosk is recorded as on-site within the programs system. This attendance data is separate from the daily classroom roll call (which tracks attendance at the core Montessori environment), but both contribute to a complete picture of the child's presence at school throughout the day. A child might be marked present on the classroom attendance roll and also have check-in records from before-school and after-school care.

## Permissions

Using the kiosk — checking children in, checking them out, and undoing check-ins — requires the **CHECKIN_CHECKOUT** permission. This is a focused permission that can be granted to front-desk staff or program coordinators without giving them broader program management access. Marking no-shows requires the separate **MANAGE_BOOKINGS** permission.
