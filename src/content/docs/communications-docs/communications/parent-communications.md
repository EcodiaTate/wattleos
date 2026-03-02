# Parent Communications

Parents access school communications through the Parent Portal, where announcements, events, and messages are presented in a unified, easy-to-navigate experience. This section describes what parents see and how they interact with each communication type.

## Announcement Feed

Parents see published announcements in their Parent Portal under the **Announcements** section. The feed shows announcements in reverse chronological order with pinned announcements at the top.

Each announcement displays the title, body, author name and avatar, priority badge, publication date, and any attachments. Parents can download attachments directly from the announcement card.

### Scoped Visibility

Parents only see announcements that are relevant to them:

- **School-scoped** announcements are visible to all parents
- **Class-scoped** announcements are visible only if the parent has a child enrolled in the targeted class
- **Program-scoped** announcements are visible only if the parent has a child booked into the targeted program

Expired announcements (past their `expires_at` date) are automatically hidden from the parent feed.

### Acknowledging Announcements

When an announcement has acknowledgement enabled, parents see an "Acknowledge" button. Clicking it confirms that the parent has read and understood the announcement. The acknowledgement is recorded with a timestamp and cannot be undone — this creates a verifiable record that the information was received.

Staff can see which parents have acknowledged and which have not, enabling follow-up with families who may have missed important communications.

## Events in the Parent View

School events appear in the parent feed alongside announcements, providing a single place to see everything happening at the school. Parents see:

- Event title, type icon, and description
- Date, time, and location (with map link if provided)
- Attachments (permission forms, maps, etc.)
- RSVP options (if enabled)

### RSVPing to Events

When an event has RSVP enabled, parents can respond directly from the event card:

- **Going** — With an optional guest count for additional family members
- **Maybe** — Tentative response
- **Not Going** — Confirmed non-attendance

Parents can add notes to their RSVP (e.g. dietary requirements, arrival time). They can change their response at any time before the RSVP deadline. After the deadline, responses are locked.

### Event Visibility

Like announcements, event visibility follows scope rules. School events are visible to all parents. Class events appear only for parents with children in that class. Program events appear only for parents in that program. Staff-only events are never visible to parents.

## Messages

Parents access their message channels through the **Messages** section of the Parent Portal. The inbox shows:

- **Class group channels** — Shared channels for each class where their child is enrolled. Parents can read all messages and, if parent posting is enabled, send messages to the group.
- **Program group channels** — Shared channels for programs their child is enrolled in.
- **Direct message channels** — Private one-to-one conversations with staff members (guides, administrators, office staff).

Each channel shows unread count, last message preview, and member count.

### Reading and Sending Messages

Opening a channel displays the message history with sender names, avatars, and timestamps. Messages can include text, images, and file attachments. Reply threading allows parents to respond to specific messages for contextual conversations.

When `allow_parent_posts` is disabled on a group channel, parents can only read — the message input is hidden. Direct messages always allow two-way communication.

### Starting a New Conversation

Parents can initiate a direct message with any staff member visible in the school directory. The system creates a DM channel (or returns the existing one if they have messaged that staff member before) and opens it for conversation.

## Notification Awareness

The Parent Portal shows a global unread count across all message channels, helping parents notice when new communications arrive. Unread counts are calculated from the `last_read_at` cursor — messages sent after the parent last opened the channel are counted as new.

## What Parents Cannot Do

Parents cannot create announcements, events, or group channels. They cannot see draft or unpublished announcements. They cannot see staff-only events or channels. They cannot hide or moderate messages. They cannot see acknowledgement statistics or RSVP lists for other families.

The parent communication experience is intentionally read-focused with targeted interaction points (acknowledge, RSVP, message) — keeping the interface simple while ensuring families stay informed and connected.
