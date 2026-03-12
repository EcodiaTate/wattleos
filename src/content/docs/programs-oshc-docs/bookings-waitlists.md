# Bookings and Waitlists

Bookings connect children to sessions. Whether a parent signs up for recurring after-school care or a one-off vacation care day, the booking system handles capacity management, waitlisting, cancellation policies, and billing status tracking in one workflow.

## Booking Types

Every booking has one of three types. **Recurring** bookings are created automatically from a recurring pattern - when a parent sets up "every Tuesday and Thursday OSHC," each generated session on those days gets a recurring booking. **Casual** bookings are one-off sessions booked individually by a parent or staff member. **Makeup** bookings are used when a child is given a replacement session, typically after a cancellation or absence.

The booking type affects pricing. Casual bookings are charged at the program's casual fee rate (if one is set), while recurring bookings use the standard session fee. Makeup bookings can have their fee waived or adjusted at the administrator's discretion.

## Making a Booking

Parents can book sessions through the parent portal by browsing available programs, selecting a session date, and confirming the booking. Staff can also create bookings on behalf of a parent from the session detail page.

When a booking is created, WattleOS checks the session's effective capacity (which may be set on the session itself or inherited from the program). If space is available, the booking is confirmed immediately. If the session is full, the booking is placed on the waitlist with a position number.

Each child can only have one active booking per session - attempting to create a duplicate booking is blocked. If a previous booking for the same child and session was cancelled, a new booking can be created.

The fee is calculated and locked in at booking time based on the booking type and the program's current pricing. If the program's fee changes later, existing bookings are not affected.

## Recurring Booking Patterns

For families with regular schedules, recurring patterns eliminate the need to book each session individually. A pattern specifies the program, the child, which days of the week to book (for example, Tuesday and Thursday), an effective start date, and an optional end date.

Patterns have three statuses: **active** (bookings are being generated for new sessions), **paused** (generation is temporarily stopped but the pattern is preserved), and **cancelled** (the pattern is terminated). When creating a pattern, WattleOS validates that the requested days match the program's operating days.

Cancelling a recurring pattern sets its end date to today and changes its status to cancelled. By default, existing future bookings created by the pattern remain intact - the parent may still want to attend sessions already booked. However, there is an option to cancel all future bookings tied to the pattern at the same time, which is useful when a family is leaving the program entirely.

Parents can view all their recurring patterns in the parent portal's "My Bookings" section, showing which programs their child is enrolled in, which days are covered, and the effective dates.

## The Waitlist

When a session reaches capacity, new bookings are automatically placed on the waitlist. Each waitlisted booking receives a position number indicating their place in the queue.

When a confirmed booking is cancelled, WattleOS automatically promotes the next child on the waitlist to confirmed status. This happens immediately - the waitlisted booking's status changes from waitlisted to confirmed and the waitlist position is cleared. The system processes promotions in order of waitlist position, so the family who joined the waitlist first is promoted first.

Staff can view and manage the waitlist from the session detail page, seeing each waitlisted child's position, the parent who made the booking, and the booking type.

## Cancelling a Booking

When a booking is cancelled, WattleOS records who cancelled it, when, and an optional reason. The system checks the program's cancellation notice period - if the cancellation happens within the required notice window (for example, less than 24 hours before the session), it is flagged as a late cancellation and the late cancellation fee may apply.

After a confirmed booking is cancelled, the waitlist promotion process runs automatically. Staff can also cancel bookings and mark children as no-shows from the session detail page. A no-show means the child was expected but did not attend - the booking fee typically still applies depending on school policy.

## Billing Integration

Every booking tracks a billing status: **unbilled** (the default - the charge has not yet been invoiced), **billed** (the charge has been added to an invoice via Stripe), **waived** (the charge has been removed, for example as a goodwill gesture), or **refunded** (the charge was billed but subsequently refunded). When the billing integration marks a booking as billed, the Stripe invoice line item ID is stored on the booking record for reconciliation.

## Permissions

Creating and cancelling bookings requires either the **MANAGE_BOOKINGS** permission (for staff) or guardian access to the child (for parents, enforced via row-level security). Managing recurring patterns follows the same rules. Marking bookings as no-show requires **MANAGE_BOOKINGS**. Billing status updates require **MANAGE_BOOKINGS**.
