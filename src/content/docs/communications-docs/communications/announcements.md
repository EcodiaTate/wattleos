# Announcements

Announcements are one-to-many broadcasts from staff to parents and the school community. They support scheduling, expiry, priority levels, scoped targeting, file attachments, and acknowledgement tracking — everything a school needs for effective parent communication.

## Accessing Announcements

Navigate to **Comms → Announcements** in the sidebar. Creating and managing announcements requires the **Send Announcements** permission, which is included in the default Administrator and Guide roles.

## Creating an Announcement

Click **New Announcement** to open the creation form:

**Title** — A concise headline for the announcement (e.g. "School Photos — Thursday 6 March").

**Body** — The full announcement text. Supports rich text formatting for clear, readable communication.

**Priority** — Sets the visual prominence of the announcement:
- **Low** — Informational, no urgency (grey styling)
- **Normal** — Standard school communication (blue styling)
- **High** — Important, needs attention soon (orange styling)
- **Urgent** — Critical, requires immediate action (red styling)

**Scope** — Controls who sees the announcement:
- **School** — Visible to everyone in the school (all staff and all parents)
- **Class** — Visible only to staff and parents of students in the selected class
- **Program** — Visible only to staff and parents of students in the selected program (e.g. Before School Care)

When selecting Class or Program scope, you must choose the specific target. School-scoped announcements require no target selection.

**Scheduling** — Choose to publish immediately or schedule for a future date and time. Scheduled announcements remain as drafts until their scheduled time, when they are automatically published.

**Expiry** — Optionally set an expiry date after which the announcement is hidden from feeds. Useful for time-sensitive information like "Picture Day is tomorrow" that becomes irrelevant after the event.

**Attachments** — Attach files to the announcement (e.g. permission forms, event flyers, newsletters). Each attachment stores a name, URL, and MIME type.

**Requires Acknowledgement** — When enabled, parents see an "Acknowledge" button on the announcement. Staff can then track who has and has not acknowledged, making this ideal for consent forms, policy updates, or safety notices.

**Pin to Top** — Pinned announcements stay at the top of the announcement feed regardless of publication date. Useful for term-long notices like "School Hours Change" or "Emergency Contacts Update."

## Publishing and Scheduling

Announcements can be in one of three states:

**Draft** — Created but not published. No `published_at` timestamp. Not visible to parents. Drafts with a `scheduled_for` date will be automatically published at that time.

**Published** — Has a `published_at` timestamp and is visible to the target audience immediately. You can publish immediately when creating (toggle "Publish Now") or manually publish a draft later.

**Expired** — Past the `expires_at` date. Filtered out of the default feed but preserved in the system for historical reference.

To manually publish a draft, open it and click **Publish**. This sets `published_at` to now and clears any scheduled date.

## Acknowledgement Tracking

When an announcement has `requires_acknowledgement` enabled:

- Parents see an "Acknowledge" button below the announcement
- Clicking it records the parent's acknowledgement with a timestamp (upsert pattern — clicking multiple times does not create duplicates)
- Staff can view acknowledgement statistics: total count and a list of who acknowledged with timestamps
- The acknowledgement count appears on the announcement card in the staff feed

This is particularly useful for urgent announcements where the school needs confirmation that parents have read and understood the information — emergency procedure changes, custody updates, health alerts, and similar communications.

## Announcement Feed

The announcement list page shows all announcements in reverse chronological order (newest first). Pinned announcements always appear at the top. The feed supports filtering by:

- **Scope** — School, class, or program
- **Target class** — When filtering by class scope
- **Priority** — Low, normal, high, or urgent
- **Pinned only** — Show only pinned announcements
- **Include drafts** — Show unpublished drafts alongside published announcements
- **Include expired** — Show announcements past their expiry date

Each announcement card shows the title, author (with avatar), priority badge, scope indicator, publication date, attachment count, and acknowledgement count.

## Editing and Deleting

Published announcements can be edited — useful for correcting typos or updating details. All fields are editable after publication.

Deleting an announcement is a soft delete. The announcement is removed from all feeds but preserved in the database for audit purposes.

## Permissions

- **Send Announcements** — Create, edit, publish, delete announcements. View acknowledgement statistics.
- **Send Class Messages** — Not required for announcements (this permission is for chat channels)
