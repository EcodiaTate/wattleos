# Messages and Chat Channels

WattleOS provides persistent chat channels for ongoing communication between staff, and between staff and parents. Channels support real-time messaging, read tracking, file sharing, reply threads, and moderation — replacing the need for external messaging apps.

## Accessing Messages

Navigate to **Comms → Messages** in the sidebar. The inbox shows all channels you are a member of, with unread counts and a preview of the most recent message.

## Channel Types

WattleOS supports four channel types, each designed for a specific communication pattern:

### Class Group

A shared channel for everyone connected to a class: the class guides and all parents of enrolled students. When a class group channel is created, WattleOS automatically populates the member list by pulling all guides assigned to the class and all guardians of actively enrolled students.

Class group channels are one-per-class — attempting to create a duplicate for the same class is blocked. As students enroll or leave, the channel membership can be refreshed to stay current.

**Use for**: Weekly updates, class photos, reminders about upcoming activities, general class communication.

### Program Group

Similar to class groups but scoped to a program (e.g. Before School Care, After School Care, Vacation Care). Members are automatically populated from program bookings.

**Use for**: Program-specific updates, schedule changes, session reminders.

### Direct Messages

One-to-one private channels between any two members of the school. Creating a direct message is idempotent — if a DM channel already exists between two users, the existing channel is returned rather than creating a duplicate. You cannot create a DM channel with yourself.

**Use for**: Private parent-teacher conversations, individual student matters, sensitive discussions.

### Staff Channels

Channels restricted to staff members only. Parents cannot see or join staff channels. These require the **Moderate Chat** permission to create.

**Use for**: Team coordination, staff meetings, internal discussions, planning.

## Sending Messages

Open a channel to see the message thread and compose new messages. Messages support:

**Text** — Standard text messages.

**Images** — Attach images directly in the conversation with preview.

**Files** — Share documents, forms, or other files with a name and download link.

**Replies** — Reply to a specific message to create a threaded conversation within the channel. The reply references the original message for context.

**System messages** — Automatically generated messages for channel events (member joined, member left, channel created).

## Message Inbox

The inbox displays all your channels sorted by most recent activity. Each channel card shows:

- Channel name (or the other user's name for direct messages)
- Channel type indicator (class, program, direct, staff)
- Unread message count
- Preview of the last message (content snippet, sender name, timestamp)
- Member count

The global unread count across all channels is available for notification badges — WattleOS calculates total unread messages by comparing each channel's `last_read_at` cursor against new messages since that timestamp.

## Channel Settings

Channel owners and moderators can configure:

**Name** — Custom display name for the channel.

**Allow Parent Posts** — When enabled (default), parents can send messages. When disabled, parents can only read — useful for channels that are purely informational broadcasts from staff.

**Moderated** — When enabled, moderators can review and hide messages that violate community guidelines.

**Active** — Deactivate a channel to prevent new messages without deleting the history.

## Read Tracking

WattleOS tracks when each member last read a channel. The `last_read_at` timestamp on the channel membership record is updated when a member opens the channel. Messages sent after this timestamp are counted as unread.

This enables accurate unread counts both per-channel (shown in the inbox) and globally (used for notification badges in the sidebar).

## Muting

Members can mute a channel to suppress notification badges without leaving the channel. Muted channels still appear in the inbox but do not contribute to the global unread count.

## Permissions

- **Send Class Messages** — Create class group and program group channels. Send messages in group channels.
- **Moderate Chat** — Create staff channels. Hide and unhide messages. Update channel settings.
- **Manage Directory** — Related permission for controlling who appears in the school directory (affects who can be messaged).
- Direct messages require no special permission — any authenticated user within the tenant can create a DM.
